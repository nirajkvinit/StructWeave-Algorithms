---
id: E191
old_id: A018
slug: detect-capital
title: Detect Capital
difficulty: easy
category: easy
topics: ["string"]
patterns: ["string-validation", "case-checking"]
estimated_time_minutes: 15
frequency: low
prerequisites: ["string-manipulation", "character-comparison"]
related_problems: ["E058", "E125", "M539"]
strategy_ref: ../strategies/data-structures/strings.md
---
# Detect Capital

## Problem

Given a word represented as a string, determine whether its capitalization follows standard English rules. There are exactly three valid patterns: all letters uppercase (like "USA" or "NASA"), all letters lowercase (like "programming" or "hello"), or title case where only the first letter is uppercase and all others are lowercase (like "Python" or "Google").

Your task is to check if the given word matches one of these three patterns. Return `true` if it does, `false` otherwise. Note that words like "fLaG" or "UsA" are invalid because they mix cases incorrectly. Even single-character words must follow these rules: "A" and "a" are both valid, but they represent different patterns (all uppercase vs. all lowercase).

The problem is simpler than it first appears. Rather than building complex validation logic, consider using your programming language's built-in string methods to check each pattern directly.

## Why This Matters

Capitalization validation appears in text editors, form validators, and content management systems. This problem introduces you to string validation patterns, which are fundamental when building input sanitizers, spell checkers, or email/password validators. While the problem itself is straightforward, the thinking process translates directly to more complex validation tasks like detecting camelCase in code linters, validating proper nouns in natural language processing, or ensuring consistent formatting in automated documentation tools. Companies building text-heavy products like Grammarly, Notion, or Google Docs rely on these character-level checks. The pattern of checking multiple conditions against the same data also appears in configuration validation and data quality checks across backend systems.

## Examples

**Example 1:**
- Input: `word = "USA"`
- Output: `true`

**Example 2:**
- Input: `word = "FlaG"`
- Output: `false`

## Constraints

- 1 <= word.length <= 100
- word consists of lowercase and uppercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Identifying the Pattern
Can you determine which pattern the word should follow by examining just the first one or two characters? How does the case of the first and second letters constrain the rest of the word?

### Hint 2: Simple Validation
Instead of writing complex logic, could you use built-in string methods to check each pattern? What methods tell you if a string is all uppercase, all lowercase, or title case?

### Hint 3: Edge Cases
What if the word has only one character? What are the valid patterns for single-character words? Does your solution handle this correctly?

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Built-in Methods | O(n) | O(1) or O(n) | Depends on language (may create copies) |
| Manual Character Check | O(n) | O(1) | Iterate once, check each character |
| Pattern Matching | O(n) | O(1) | Check first chars, validate rest |

## Common Mistakes

### Mistake 1: Overly complex conditional logic
```python
# Wrong: Unnecessarily complex with many conditions
def detectCapitalUse(word):
    upper_count = sum(1 for c in word if c.isupper())
    if upper_count == len(word):
        return True
    elif upper_count == 0:
        return True
    elif upper_count == 1 and word[0].isupper():
        return True
    else:
        return False
```
**Why it's wrong**: While this works, it's overly verbose. Can be simplified using built-in methods or clearer logic.

### Mistake 2: Not checking first character for title case
```python
# Wrong: Allows uppercase letters anywhere if count is 1
def detectCapitalUse(word):
    upper_count = sum(1 for c in word if c.isupper())
    return upper_count == len(word) or upper_count == 0 or upper_count == 1
```
**Why it's wrong**: For title case, the single uppercase letter MUST be the first character. "flaG" has one uppercase letter but should return false.

### Mistake 3: Inefficient repeated passes
```python
# Wrong: Multiple full passes through string
def detectCapitalUse(word):
    all_upper = all(c.isupper() for c in word)
    all_lower = all(c.islower() for c in word)
    title_case = word[0].isupper() and all(c.islower() for c in word[1:])
    return all_upper or all_lower or title_case
```
**Why it's wrong**: While correct, this can make up to 3 full passes through the string. Can be optimized to a single pass or using built-in methods more efficiently.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Correct Sentence Capitalization | Easy | Validate capitalization of entire sentence |
| Title Case Converter | Easy | Convert string to proper title case |
| Count Capitalization Errors | Easy | Count how many characters have wrong case |
| Fix Capitalization | Medium | Correct the string to nearest valid pattern |
| Detect CamelCase | Medium | Identify if string follows camelCase convention |
| Parse Mixed Case Identifiers | Medium | Split camelCase or snake_case into words |

## Practice Checklist

Track your progress on mastering this problem:

**Initial Practice**
- [ ] Solve using built-in string methods (isupper, islower, istitle)
- [ ] Implement manual character-by-character check
- [ ] Handle edge case of single character word

**After 1 Day**
- [ ] Implement in one-liner or minimal code
- [ ] Can you explain all three valid patterns clearly?
- [ ] Test with tricky cases: "g", "G", "FlaG", "USA", "Google"

**After 1 Week**
- [ ] Solve in under 8 minutes
- [ ] Implement without using any built-in case methods
- [ ] Optimize for single-pass solution

**After 1 Month**
- [ ] Solve sentence capitalization variation
- [ ] Implement converter to fix invalid capitalization
- [ ] Apply pattern to validate other string formats

## Strategy

**Pattern**: String Validation with Case Rules
**Key Insight**: Only three valid patterns exist. Check if input matches any one using simple character case tests.

See [String Manipulation](../strategies/data-structures/strings.md) for more on character-level operations and validation patterns.
