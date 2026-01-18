---
id: E148
old_id: I207
slug: valid-word-abbreviation
title: Valid Word Abbreviation
difficulty: easy
category: easy
topics: ["string", "two-pointers"]
patterns: ["two-pointers", "string-matching"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E020", "M100", "E125"]
prerequisites: ["two-pointers", "string-parsing", "character-validation"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Valid Word Abbreviation

## Problem

A word can be abbreviated by replacing consecutive sequences of characters with the count of characters replaced. For example, "internationalization" can become "i18n" by replacing the 18 middle characters. The rules for valid abbreviations are strict: replaced sequences must be non-adjacent (you can't have two numbers touching), no sequence can be empty (no zero counts), and numeric values cannot have leading zeros (so "s010n" is invalid).

Given an original word and a potential abbreviation string, determine whether the abbreviation is valid for that specific word. The abbreviation must match the word exactly when you expand the numbers back to the correct number of characters. For instance, "i12iz4n" is valid for "internationalization" because i + 12 chars + iz + 4 chars + n reconstructs the original word.

You'll need to use a two-pointer approach, walking through both strings simultaneously. When you encounter a letter in the abbreviation, it must match the corresponding position in the original word. When you encounter a digit, you must parse the complete number (which could be multiple digits like "12"), ensure it doesn't start with zero, then skip that many characters in the original word. Edge cases include abbreviations that skip beyond the word's length, numbers with leading zeros, and ensuring both strings are fully consumed when validation completes. The problem tests your ability to handle multi-character number parsing and maintain synchronized traversal of two strings with different advancement rates.

## Why This Matters

String validation and two-pointer techniques are essential for parsing, text processing, and implementing custom protocols. This problem appears in real-world scenarios like file path validation, URL shortening verification, template matching in text editors, and compression algorithm validation. The pattern of parsing mixed alphanumeric strings appears in configuration file readers, log parsers, command-line argument processing, and data serialization formats. The two-pointer approach demonstrated here is fundamental to string algorithms including palindrome checking, substring search, pattern matching, and sequence comparison. Interview questions frequently test your ability to handle edge cases in string processing because production code must robustly handle malformed input, making this problem's emphasis on validation rules (leading zeros, boundary checks) directly applicable to real systems. Understanding how to parse variable-length numeric tokens from character streams is essential for lexical analysis, expression evaluation, and building domain-specific languages.

## Examples

**Example 1:**
- Input: `word = "internationalization", abbr = "i12iz4n"`
- Output: `true`
- Explanation: We can form "i12iz4n" by keeping 'i', replacing 12 characters, keeping 'iz', replacing 4 characters, then keeping 'n'.

**Example 2:**
- Input: `word = "apple", abbr = "a2e"`
- Output: `false`
- Explanation: This abbreviation doesn't match the structure of "apple".

## Constraints

- 1 <= word.length <= 20
- word consists of only lowercase English letters.
- 1 <= abbr.length <= 10
- abbr consists of lowercase English letters and digits.
- All the integers in abbr will fit in a 32-bit integer.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Two Pointer Traversal
Use two pointers, one for the word and one for the abbreviation. When you encounter a letter in abbr, check if it matches the current character in word. When you encounter a digit, parse the complete number (could be multi-digit) and skip that many characters in word. Watch for leading zeros and boundary conditions.

**Key insight**: Process abbr character by character, either matching letters or skipping positions based on numbers.

### Intermediate Approach - Number Parsing with Validation
Implement careful number parsing. When you see a digit, accumulate all consecutive digits to form the number (e.g., "12" = 1*10 + 2). Check that numbers don't start with 0. Advance the word pointer by this number. Ensure you don't go out of bounds.

**Key insight**: Multi-digit numbers require careful parsing, and leading zeros invalidate the abbreviation.

### Advanced Approach - Single Pass with Edge Case Handling
Combine matching and skipping in a single pass with explicit handling of all edge cases: leading zeros ('0' at start of number), numbers that skip beyond word length, abbreviation longer than needed, and mismatched characters. Return false immediately on any violation.

**Key insight**: Early termination on invalid cases saves unnecessary processing.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Two Pointers | O(n + m) | O(1) | n = word length, m = abbr length |
| With Number Parsing | O(n + m) | O(1) | Same, number parsing is O(m) worst case |
| Recursive | O(n + m) | O(m) | Call stack depth up to abbr length |

Linear time is optimal since we must examine each character at least once.

## Common Mistakes

### Mistake 1: Not Checking for Leading Zeros
```python
# Wrong: Accepting numbers with leading zeros
def validWordAbbreviation(word, abbr):
    i, j = 0, 0
    while i < len(word) and j < len(abbr):
        if abbr[j].isdigit():
            num = 0
            while j < len(abbr) and abbr[j].isdigit():
                num = num * 10 + int(abbr[j])
                j += 1
            i += num  # Missing check for leading zero
        # ... rest of logic
```

**Why it fails**: Accepts invalid abbreviations like `"s010n"` where `010` has leading zero.

**Fix**: Check if the first digit is '0' before parsing: `if abbr[j] == '0': return False`.

### Mistake 2: Single Digit Number Parsing
```python
# Wrong: Only handling single digit numbers
def validWordAbbreviation(word, abbr):
    i, j = 0, 0
    while i < len(word) and j < len(abbr):
        if abbr[j].isdigit():
            i += int(abbr[j])  # Only uses one digit
            j += 1
        # ... rest of logic
```

**Why it fails**: Fails on abbreviations with multi-digit numbers like `"i12iz4n"`.

**Fix**: Parse all consecutive digits: `while j < len(abbr) and abbr[j].isdigit(): num = num * 10 + int(abbr[j]); j += 1`.

### Mistake 3: Not Validating Final Positions
```python
# Wrong: Not checking if both strings are fully consumed
def validWordAbbreviation(word, abbr):
    i, j = 0, 0
    while i < len(word) and j < len(abbr):
        # ... matching logic
        i += 1
        j += 1
    return True  # Missing validation
```

**Why it fails**: Returns true even if one string has remaining characters. `"hi"` and `"hi2"` would match incorrectly.

**Fix**: Return `i == len(word) and j == len(abbr)` to ensure both are fully consumed.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Generate All Abbreviations | Medium | Generate all valid abbreviations for a given word |
| Minimum Abbreviation Length | Medium | Find the shortest valid abbreviation |
| Unique Abbreviation | Hard | Find an abbreviation that's unique in a dictionary |
| Word Pattern Matching | Medium | Match abbreviation pattern with wildcards |
| Longest Common Abbreviation | Hard | Find longest abbreviation valid for multiple words |

## Practice Checklist

Track your progress on this problem:

- [ ] **Day 0**: Solve with two-pointer approach (25 min)
- [ ] **Day 1**: Review edge cases (leading zeros, multi-digit, out of bounds)
- [ ] **Day 3**: Implement without looking at previous solution (15 min)
- [ ] **Day 7**: Handle all error cases with early termination (20 min)
- [ ] **Day 14**: Explain the approach and common pitfalls (10 min)
- [ ] **Day 30**: Speed solve in under 10 minutes

**Strategy**: See [Two Pointers](../strategies/patterns/two-pointers.md)
