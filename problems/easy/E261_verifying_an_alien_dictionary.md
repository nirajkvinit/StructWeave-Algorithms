---
id: E261
old_id: A420
slug: verifying-an-alien-dictionary
title: Verifying an Alien Dictionary
difficulty: easy
category: easy
topics: ["string", "hash-table"]
patterns: ["custom-comparator"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E014", "E242", "M049"]
prerequisites: ["strings", "hash-map", "comparison"]
strategy_ref: ../prerequisites/hash-tables.md
---
# Verifying an Alien Dictionary

## Problem

Imagine encountering an alien language that uses the same 26 lowercase English letters as we do, but with a completely different alphabetical ordering. For instance, in this alien alphabet, 'z' might come before 'a', or 'h' might come before 'e'. You're given this custom alphabet order as a string of all 26 letters in their alien ordering.

Your task is to verify whether a list of words is sorted according to this alien dictionary's lexicographical rules. Lexicographical ordering (also called dictionary order) works the same way as in English: compare words character by character from left to right, and the first differing character determines the order. If one word is a prefix of another (like "app" and "apple"), the shorter word must come first.

Given an array of `words` and the alien alphabet `order`, return `true` if the words are properly sorted according to the alien alphabet, and `false` otherwise. An important edge case to consider: if "apple" appears before "app" in the list, this violates sorting order because "app" should come first (being a prefix).

## Why This Matters

Custom sorting and comparison logic appears throughout software engineering, from internationalization systems that handle different language collations to database systems with custom sort orders. This problem teaches you to work with hash maps for efficient lookups and to implement custom comparison functions - a skill needed when sorting objects by complex criteria, implementing priority queues with custom priorities, or building search engines with relevance scoring. The technique of converting characters to numerical positions for comparison is fundamental in character encoding, string hashing, and cryptographic applications. Many interview questions test your ability to define and implement custom comparison logic correctly, especially for edge cases like prefix relationships.

## Examples

**Example 1:**
- Input: `words = ["hello","algoprac"], order = "hlabcdefgijkmnopqrstuvwxyz"`
- Output: `true`
- Explanation: In this alphabet, 'h' precedes 'l', so the words are correctly ordered.

**Example 2:**
- Input: `words = ["word","world","row"], order = "worldabcefghijkmnpqstuvxyz"`
- Output: `false`
- Explanation: In this alphabet, 'd' comes after 'l', making "word" > "world", so the sequence is not sorted.

**Example 3:**
- Input: `words = ["apple","app"], order = "abcdefghijklmnopqrstuvwxyz"`
- Output: `false`
- Explanation: The first three characters match, but "apple" is longer. Lexicographically, "apple" > "app" because any character is greater than the absence of a character.

## Constraints

- 1 <= words.length <= 100
- 1 <= words[i].length <= 20
- order.length == 26
- All characters in words[i] and order are English lowercase letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1: Conceptual Foundation
- Map each letter to its position in the alien alphabet
- Compare adjacent words pairwise (word1 vs word2, word2 vs word3, etc.)
- For each pair, find the first differing character and check ordering
- Handle the case where one word is a prefix of another

### Tier 2: Step-by-Step Strategy
- Create a hash map: letter -> index in alien alphabet
- For each adjacent pair of words:
  - Compare character by character until you find a difference
  - Check if the first different character follows the alien order
  - If word1 is a prefix of word2, this is valid
  - If word2 is a prefix of word1, this is invalid (longer word should come first)
- If all adjacent pairs are valid, return true

### Tier 3: Implementation Details
- Build `order_map = {char: i for i, char in enumerate(order)}`
- For `i` in range `0` to `len(words) - 2`:
  - Let `word1 = words[i]`, `word2 = words[i + 1]`
  - Find first position `j` where `word1[j] != word2[j]`
  - If found, check: `order_map[word1[j]] < order_map[word2[j]]`
  - If not found, check: `len(word1) <= len(word2)`
  - If any check fails, return false
- Return true if all checks pass

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Hash Map + Pairwise Comparison | O(n * m) | O(1) | n = words count, m = average word length, O(26) = O(1) for map |
| Custom Sort + Compare | O(n * m * log n) | O(n * m) | Sort words, then compare with original |
| Character-by-Character Without Map | O(n * m * 26) | O(1) | Linear search in order string, inefficient |

**Optimal Solution**: Hash map approach achieves O(n * m) time with O(1) space.

## Common Mistakes

### Mistake 1: Not handling prefix case correctly
```python
# Wrong: only checking first difference
word1, word2 = "app", "apple"
for i in range(min(len(word1), len(word2))):
    if word1[i] != word2[i]:
        return order_map[word1[i]] < order_map[word2[i]]
return True  # Wrong! Should check lengths

# Correct: validate prefix relationship
for i in range(min(len(word1), len(word2))):
    if word1[i] != word2[i]:
        return order_map[word1[i]] < order_map[word2[i]]
# If we exit loop, one is prefix of other
return len(word1) <= len(word2)  # Shorter must come first
```

### Mistake 2: Comparing all pairs instead of adjacent pairs
```python
# Wrong: comparing every pair (O(n²))
for i in range(len(words)):
    for j in range(i + 1, len(words)):
        if not is_sorted(words[i], words[j]):
            return False

# Correct: only compare adjacent pairs (O(n))
for i in range(len(words) - 1):
    if not is_sorted(words[i], words[i + 1]):
        return False
```

### Mistake 3: Not building the order map
```python
# Wrong: linear search for each character
def compare(c1, c2):
    return order.index(c1) < order.index(c2)  # O(26) each time

# Correct: build map once
order_map = {c: i for i, c in enumerate(order)}  # O(26) once
def compare(c1, c2):
    return order_map[c1] < order_map[c2]  # O(1) each time
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Sort words by alien dictionary | Medium | Actually sort the array using custom order |
| Recover alien dictionary order | Hard | Given sorted words, deduce the alphabet order |
| Multiple possible orderings | Hard | Find all valid orderings or count them |
| Case-sensitive alien alphabet | Medium | Handle both uppercase and lowercase |
| With numeric characters | Medium | Extend alphabet to include digits |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Solved independently on first attempt
- [ ] Completed within 15 minutes
- [ ] Built hash map for O(1) character lookup
- [ ] Correctly handled prefix edge case
- [ ] Used adjacent pair comparison (not all pairs)
- [ ] Wrote bug-free code on first submission
- [ ] Explained solution clearly to someone else
- [ ] Solved without hints after 1 day
- [ ] Solved without hints after 1 week
- [ ] Identified time and space complexity correctly

**Spaced Repetition Schedule**: Review on Day 1, Day 3, Day 7, Day 14, Day 30

**Strategy**: See [Hash Tables](../prerequisites/hash-tables.md)
