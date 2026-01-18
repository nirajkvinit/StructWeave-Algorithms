---
id: E111
old_id: I089
slug: word-pattern
title: Word Pattern
difficulty: easy
category: easy
topics: ["string", "hash-table", "bijection"]
patterns: ["hash-map"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E001", "E205", "M890"]
prerequisites: ["hash-map", "string-split", "bijection"]
strategy_ref: ../strategies/data-structures/hash-table.md
---
# Word Pattern

## Problem

You're given a pattern string and a text string `s`. Determine whether `s` follows the same structural pattern as the pattern string.

"Following a pattern" means establishing a bijection, or one-to-one correspondence, between each character in the pattern and a distinct word in `s`. Think of it like a secret code: each pattern character must consistently map to exactly one word, and each word must map back to exactly one character. No two different characters can represent the same word, and no two different words can be represented by the same character.

For example, if pattern is "abba" and s is "dog cat cat dog", this works because 'a' maps to "dog", 'b' maps to "cat", and following the pattern gives us the exact sequence in s. However, "abba" and "dog cat cat fish" fails because the fourth position requires 'a' to map to both "dog" and "fish", which violates the one-to-one rule.

The key insight is that you need bidirectional checking. It's not enough to verify that each character maps to a consistent word; you must also ensure no two characters share the same word. This is similar to checking if two people can't have the same email address AND the same email can't belong to two people.

## Why This Matters

Bijection problems appear throughout computer science in database schema design (foreign keys), cryptography (substitution ciphers), compiler design (variable name mapping), and graph theory (isomorphism checking). Understanding one-to-one mappings is fundamental to data integrity and validation.

This pattern of using two hash maps for bidirectional validation is a common interview technique that extends to problems involving translations, mappings between coordinate systems, and verifying structural equivalence. It's frequently asked at companies testing your ability to handle edge cases and understand relationship constraints.

The string splitting and simultaneous iteration techniques you'll use here appear in parsing configuration files, processing log data, and natural language processing tasks. Learning to validate structural patterns prepares you for schema validation, template matching, and data transformation pipelines.

## Examples

**Example 1:**
- Input: `pattern = "abba", s = "dog cat cat dog"`
- Output: `true`

**Example 2:**
- Input: `pattern = "abba", s = "dog cat cat fish"`
- Output: `false`

**Example 3:**
- Input: `pattern = "aaaa", s = "dog cat cat dog"`
- Output: `false`

## Constraints

- 1 <= pattern.length <= 300
- pattern contains only lower-case English letters.
- 1 <= s.length <= 3000
- s contains only lowercase English letters and spaces ' '.
- s **does not contain** any leading or trailing spaces.
- All the words in s are separated by a **single space**.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Bijection Requirement</summary>

This problem requires a bijection (one-to-one mapping) between characters and words. Each character must map to exactly one word, AND each word must map back to exactly one character. It's not enough to just check char->word mapping; you also need to ensure no two different characters map to the same word.

</details>

<details>
<summary>🎯 Hint 2: Two Hash Maps</summary>

Use two hash maps: one mapping characters to words (char_to_word) and another mapping words to characters (word_to_char). As you iterate through the pattern and split words, check both mappings for consistency. If you find a character already mapped to a different word, or a word already mapped to a different character, return false.

</details>

<details>
<summary>📝 Hint 3: Simultaneous Iteration</summary>

Pseudocode:
```
words = s.split(' ')
if len(pattern) != len(words):
    return false

char_to_word = {}
word_to_char = {}

for i from 0 to len(pattern):
    char = pattern[i]
    word = words[i]

    if char in char_to_word:
        if char_to_word[char] != word:
            return false
    else:
        char_to_word[char] = word

    if word in word_to_char:
        if word_to_char[word] != char:
            return false
    else:
        word_to_char[word] = char

return true
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force Matching | O(n * m²) | O(1) | Compare every char-word pair repeatedly |
| Single Hash Map | O(n + m) | O(n) | Fails to catch word->char conflicts |
| **Two Hash Maps** | **O(n + m)** | **O(n + k)** | Optimal: Ensures bijection with two-way mapping |

Where n = pattern length, m = total characters in s, k = number of unique words

## Common Mistakes

### Mistake 1: Only Checking One Direction

**Wrong:**
```python
def wordPattern(pattern, s):
    words = s.split()
    if len(pattern) != len(words):
        return False

    char_to_word = {}
    for i in range(len(pattern)):
        char = pattern[i]
        if char in char_to_word:
            if char_to_word[char] != words[i]:
                return False
        else:
            char_to_word[char] = words[i]
    return True
    # Fails: pattern="abba", s="dog dog dog dog"
    # All 'a' and 'b' map to "dog" - no bijection
```

**Correct:**
```python
def wordPattern(pattern, s):
    words = s.split()
    if len(pattern) != len(words):
        return False

    char_to_word = {}
    word_to_char = {}

    for char, word in zip(pattern, words):
        if char in char_to_word and char_to_word[char] != word:
            return False
        if word in word_to_char and word_to_char[word] != char:
            return False
        char_to_word[char] = word
        word_to_char[word] = char

    return True
```

You must check both directions to ensure bijection.

### Mistake 2: Not Checking Length Mismatch

**Wrong:**
```python
def wordPattern(pattern, s):
    words = s.split()
    # Missing length check!
    char_to_word = {}
    for i in range(len(pattern)):  # Could index out of bounds
        # ...
```

**Correct:**
```python
def wordPattern(pattern, s):
    words = s.split()
    if len(pattern) != len(words):
        return False
    # Now safe to iterate
```

Always check that pattern and words list have the same length before iterating.

### Mistake 3: Using Set Size Comparison Only

**Wrong:**
```python
def wordPattern(pattern, s):
    words = s.split()
    return len(set(pattern)) == len(set(words)) == len(set(zip(pattern, words)))
    # Fails: pattern="abba", s="dog constructor constructor dog"
    # Both have 2 unique elements but don't form bijection
```

**Correct:**
```python
def wordPattern(pattern, s):
    words = s.split()
    if len(pattern) != len(words):
        return False

    char_to_word = {}
    word_to_char = {}

    for char, word in zip(pattern, words):
        if char in char_to_word and char_to_word[char] != word:
            return False
        if word in word_to_char and word_to_char[word] != char:
            return False
        char_to_word[char] = word
        word_to_char[word] = char

    return True
```

Set size comparison doesn't verify the actual mapping relationships.

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Isomorphic Strings | Check if two strings are isomorphic | Easy |
| Word Pattern II | Pattern with multiple characters per word | Medium |
| Pattern Matching | Match with wildcard characters | Hard |
| K-Pattern | Generalize to k different patterns | Medium |
| Case-Insensitive Pattern | Handle uppercase/lowercase variations | Easy |

## Practice Checklist

- [ ] Solve using two hash maps (10 min)
- [ ] Handle edge case: different lengths (5 min)
- [ ] Test with bijection violations (5 min)
- [ ] Review after 24 hours
- [ ] Review after 1 week
- [ ] Compare with Isomorphic Strings problem

**Strategy**: See [Hash Table Pattern](../strategies/data-structures/hash-table.md)
