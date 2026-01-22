---
id: E110
old_id: I087
slug: unique-word-abbreviation
title: Unique Word Abbreviation
difficulty: easy
category: easy
topics: ["string", "hash-table", "design"]
patterns: ["hash-map"]
estimated_time_minutes: 15
frequency: low
related_problems: ["E170", "E288", "M527"]
prerequisites: ["hash-map", "string-manipulation", "class-design"]
strategy_ref: ../prerequisites/hash-table.md
---
# Unique Word Abbreviation

## Problem

An abbreviation compresses a word by keeping its first and last characters while replacing the middle with a count. For example, "internationalization" becomes "i18n" because 18 characters exist between the opening 'i' and closing 'n'. The word "dog" abbreviates to "d1g" since one character ('o') sits between 'd' and 'g'. Words with exactly two characters like "it" serve as their own abbreviation.

Design a `ValidWordAbbr` class that determines whether a word has a unique abbreviation within a given dictionary. The class should support two operations: a constructor that accepts the dictionary, and an `isUnique` method that checks uniqueness.

Here's the nuanced definition of "unique": a word's abbreviation is considered unique if either no dictionary word shares that abbreviation, or all dictionary words sharing the abbreviation are identical to the query word itself. This means "apple" would have a unique abbreviation if the dictionary contains only "apple" (or nothing) that abbreviates to "a3e", but not if it contains "angle" which also abbreviates to "a3e".

The key challenge is efficiency. With up to 5,000 calls to `isUnique`, you cannot afford to recompute abbreviations repeatedly. This requires thoughtful preprocessing during construction to enable fast lookups during queries. Consider how hash maps can store the relationship between abbreviations and the original words that produce them.

## Why This Matters

This problem teaches data structure design for repeated queries, a fundamental skill in system design and API development. The preprocessing versus query time tradeoff appears everywhere: database indexing, caching strategies, and search engine design all balance upfront computation against fast retrieval.

The concept of "unique" here involves bidirectional checking, which mirrors authentication systems (validating both user and credentials), network protocols (two-way handshakes), and graph matching problems. Understanding when to use sets versus lists for storage affects both correctness and performance.

Word abbreviation systems like this power code completion in IDEs, text expansion on mobile devices, and command-line interface shortcuts. The technique of mapping multiple inputs to canonical forms while tracking the original inputs appears in data deduplication, spell checkers, and phonetic matching algorithms.

## Constraints

- 1 <= dictionary.length <= 3 * 10⁴
- 1 <= dictionary[i].length <= 20
- dictionary[i] consists of lowercase English letters.
- 1 <= word.length <= 20
- word consists of lowercase English letters.
- At most 5000 calls will be made to isUnique.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Preprocessing is Key</summary>

Since the dictionary is given once but isUnique is called many times (up to 5000), you should preprocess the dictionary in the constructor. For each word, compute its abbreviation and store a mapping. What data structure helps you efficiently track which words map to each abbreviation?

</details>

<details>
<summary>🎯 Hint 2: Hash Map of Sets</summary>

Create a hash map where keys are abbreviations and values are sets of original words that produce that abbreviation. During initialization, populate this map by processing each dictionary word. When checking isUnique, compute the query word's abbreviation and check: (1) if the abbreviation doesn't exist in the map, or (2) if it exists but the set contains only the query word itself.

</details>

<details>
<summary>📝 Hint 3: Implementation Structure</summary>

Pseudocode:
```
class ValidWordAbbr:
    abbr_map = {}  // Maps abbreviation -> set of words

    constructor(dictionary):
        for word in dictionary:
            abbr = getAbbreviation(word)
            if abbr not in abbr_map:
                abbr_map[abbr] = empty set
            abbr_map[abbr].add(word)

    isUnique(word):
        abbr = getAbbreviation(word)
        if abbr not in abbr_map:
            return true
        words_with_abbr = abbr_map[abbr]
        return words_with_abbr == {word}

    getAbbreviation(word):
        if length <= 2: return word
        return word[0] + str(length-2) + word[-1]
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| No Preprocessing | O(n * m) per query | O(1) | Check all dictionary words each time - too slow |
| **Hash Map of Sets** | **O(1) per query** | **O(n * m)** | Optimal: O(n * m) preprocessing, constant time queries |

Where n = dictionary size, m = average word length

## Common Mistakes

### Mistake 1: Counting Occurrences Instead of Tracking Words

**Wrong:**
```python
class ValidWordAbbr:
    def __init__(self, dictionary):
        self.abbr_count = {}
        for word in dictionary:
            abbr = self.getAbbr(word)
            self.abbr_count[abbr] = self.abbr_count.get(abbr, 0) + 1

    def isUnique(self, word):
        abbr = self.getAbbr(word)
        return abbr not in self.abbr_count or self.abbr_count[abbr] == 1
    # Fails when word itself is in dictionary with another word sharing abbr
```

**Correct:**
```python
class ValidWordAbbr:
    def __init__(self, dictionary):
        self.abbr_map = {}
        for word in dictionary:
            abbr = self.getAbbr(word)
            if abbr not in self.abbr_map:
                self.abbr_map[abbr] = set()
            self.abbr_map[abbr].add(word)

    def isUnique(self, word):
        abbr = self.getAbbr(word)
        if abbr not in self.abbr_map:
            return True
        return self.abbr_map[abbr] == {word}
```

You need to track the actual words, not just counts, to handle the case where the query word itself is in the dictionary.

### Mistake 2: Incorrect Abbreviation for Short Words

**Wrong:**
```python
def getAbbr(self, word):
    # Always uses formula, even for short words
    return word[0] + str(len(word) - 2) + word[-1]
    # "it" -> "i0t" instead of "it"
```

**Correct:**
```python
def getAbbr(self, word):
    if len(word) <= 2:
        return word
    return word[0] + str(len(word) - 2) + word[-1]
```

Words with 2 or fewer characters should abbreviate to themselves.

### Mistake 3: Not Handling Duplicate Words in Dictionary

**Wrong:**
```python
def __init__(self, dictionary):
    self.abbr_map = {}
    for word in dictionary:  # dictionary might have duplicates
        abbr = self.getAbbr(word)
        if abbr not in self.abbr_map:
            self.abbr_map[abbr] = []
        self.abbr_map[abbr].append(word)  # Duplicates stored multiple times
```

**Correct:**
```python
def __init__(self, dictionary):
    self.abbr_map = {}
    for word in dictionary:
        abbr = self.getAbbr(word)
        if abbr not in self.abbr_map:
            self.abbr_map[abbr] = set()  # Set automatically deduplicates
        self.abbr_map[abbr].add(word)
```

Use a set to automatically handle duplicate words in the dictionary.

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Generalized Abbreviation | Generate all valid abbreviations of a word | Medium |
| Valid Word Abbreviation | Check if abbreviation matches a given word | Easy |
| Minimum Unique Abbreviation | Find shortest unique abbreviation for each word | Hard |
| K-Abbreviation | Abbreviate with k middle sections | Medium |
| Dynamic Dictionary | Support add/remove operations | Medium |

## Practice Checklist

- [ ] Implement with hash map of sets (15 min)
- [ ] Handle edge case: words with length <= 2 (5 min)
- [ ] Handle edge case: duplicate words in dictionary (5 min)
- [ ] Test with word that exists in dictionary (5 min)
- [ ] Review after 24 hours
- [ ] Review after 1 week

**Strategy**: See [Hash Table Pattern](../prerequisites/hash-table.md)
