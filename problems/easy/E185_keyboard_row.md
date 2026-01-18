---
id: E185
old_id: I299
slug: keyboard-row
title: Keyboard Row
difficulty: easy
category: easy
topics: ["array", "string", "hash-table"]
patterns: ["filtering"]
estimated_time_minutes: 15
frequency: low
related_problems:
  - E020  # Valid Anagram
  - E015  # Group Anagrams
  - E012  # Longest Common Prefix
prerequisites:
  - String manipulation
  - Set operations
  - Hash table
strategy_ref: ../strategies/data-structures/hash-table.md
---
# Keyboard Row

## Problem

Given an array of strings `words`, your task is to identify which words can be typed using letters from only a single row of a standard American QWERTY keyboard. A word qualifies if all its letters (ignoring case) come from the same row.

The standard American keyboard has three rows of letters:
- Row 1 (top): `"qwertyuiop"`
- Row 2 (middle): `"asdfghjkl"`
- Row 3 (bottom): `"zxcvbnm"`

For example, the word "Alaska" can be typed using only row 2 letters (a, l, a, s, k, a), so it qualifies. The word "Hello" uses 'h' and 'l' from row 2 but 'e' and 'o' from row 1, so it doesn't qualify. Return all words from the input array that pass this single-row test, preserving their original case and order.

The challenge is determining membership efficiently. A naive character-by-character search through row strings would work but is inefficient. Better approaches use set operations or hash maps to achieve constant-time lookups for each character.

## Why This Matters

This problem teaches set-based filtering and membership testing—fundamental operations in data validation, categorization systems, and constraint checking. The pattern of "does element X belong to category Y" appears constantly in real software: form validation (checking if input characters are allowed), text parsing (identifying token types), data cleaning (filtering records by category membership), and autocomplete systems (suggesting words based on typing patterns).

The problem also highlights the trade-off between precomputation and query time. Building a character-to-row mapping once enables fast per-word checking, demonstrating the hash map pattern of converting repeated linear searches into O(1) lookups. Additionally, case-insensitive comparison is a common real-world requirement that beginners often mishandle. This simple problem teaches defensive string processing: normalize input for comparison but preserve original formatting for output. While straightforward, these patterns form the foundation for more complex string processing and filtering tasks in production systems.

## Examples

**Example 1:**
- Input: `words = ["Hello","Alaska","Dad","Peace"]`
- Output: `["Alaska","Dad"]`

**Example 2:**
- Input: `words = ["omk"]`
- Output: `[]`

**Example 3:**
- Input: `words = ["adsdf","sfd"]`
- Output: `["adsdf","sfd"]`

## Constraints

- 1 <= words.length <= 20
- 1 <= words[i].length <= 100
- words[i] consists of English letters (both lowercase and uppercase).

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Hint
Create three sets representing the three keyboard rows. For each word, convert it to lowercase and check if all its characters belong to the same set. Use set intersection or check each character individually. Return words that pass the test.

### Intermediate Hint
Preprocess: create a mapping from each character to its row number (1, 2, or 3). For each word, convert to lowercase and check if all characters map to the same row. Use a set to collect unique row numbers for the word's characters - if the set has size 1, all characters are from one row.

### Advanced Hint
Use a hash map approach: map each lowercase letter to its row. For validation, check if len(set(row_map[c.lower()] for c in word)) == 1. This ensures all characters (ignoring case) come from the same row. Filter the words list using this condition. Time: O(n * m) where n = word count, m = avg word length.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (Check Each Char) | O(n * m) | O(1) | For each word, check each character against rows |
| Set Intersection | O(n * m) | O(1) | Convert word to set, check intersection with row sets |
| Hash Map + Set | O(n * m) | O(1) | Map chars to rows, use set to check uniqueness |
| Regex (If Allowed) | O(n * m) | O(1) | Use regex to match each row pattern |

## Common Mistakes

### Mistake 1: Not handling case sensitivity
```python
# Wrong: Case-sensitive comparison
def findWords(words):
    row1 = set("qwertyuiop")
    row2 = set("asdfghjkl")
    row3 = set("zxcvbnm")

    result = []
    for word in words:
        chars = set(word)  # "Hello" includes 'H' which won't match
        # Check if chars subset of any row...
```

**Issue**: Input can have uppercase and lowercase letters, but row definitions are lowercase only.

**Fix**: Convert word to lowercase before checking: `chars = set(word.lower())`.

### Mistake 2: Using OR instead of checking subset
```python
# Wrong: Checking if any character is in a row instead of all
def findWords(words):
    row1 = set("qwertyuiop")
    result = []
    for word in words:
        if any(c.lower() in row1 for c in word):  # Wrong logic!
            result.append(word)
```

**Issue**: This checks if ANY character is in row1, not if ALL characters are in the same row.

**Fix**: Check if all characters are in one row: `all(c.lower() in row for c in word)` for some row.

### Mistake 3: Not preserving original case in output
```python
# Wrong: Returning lowercase version
def findWords(words):
    # ... correct logic
    for word in words:
        word_lower = word.lower()
        if all(c in row1 for c in word_lower):
            result.append(word_lower)  # Wrong! Should append 'word'
```

**Issue**: The problem asks to return words that match, preserving their original case.

**Fix**: Append `word`, not `word_lower`, to the result.

## Variations

| Variation | Difficulty | Description |
|-----------|----------|-------------|
| Custom Keyboard Layout | Easy | Given different keyboard layout, find matching words |
| Multiple Row Words | Medium | Find words that use exactly K different keyboard rows |
| Longest Single-Row Word | Easy | Find the longest word that uses only one keyboard row |
| Minimize Row Switches | Medium | Find typing order that minimizes row switches |
| Dvorak Keyboard | Easy | Same problem but with Dvorak keyboard layout |

## Practice Checklist

Track your progress on this problem:

**First Attempt**
- [ ] Solved independently (15 min time limit)
- [ ] Implemented set-based or hash map solution
- [ ] All test cases passing
- [ ] Analyzed time and space complexity

**Spaced Repetition**
- [ ] Day 1: Resolve from memory
- [ ] Day 3: Solve with optimal approach
- [ ] Week 1: Implement without hints
- [ ] Week 2: Solve custom keyboard variation
- [ ] Month 1: Teach set operations to someone else

**Mastery Goals**
- [ ] Can explain set intersection approach
- [ ] Can handle edge cases (empty words, mixed case, single character)
- [ ] Can extend to custom keyboard layouts
- [ ] Can solve in under 10 minutes

**Strategy**: See [Hash Table Patterns](../strategies/data-structures/hash-table.md)
