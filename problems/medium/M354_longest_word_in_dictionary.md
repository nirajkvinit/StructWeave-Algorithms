---
id: M354
old_id: A187
slug: longest-word-in-dictionary
title: Longest Word in Dictionary
difficulty: medium
category: medium
topics: ["array", "string", "trie", "hash-table", "sorting"]
patterns: ["trie", "dfs"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E720", "M676", "M1032"]
prerequisites: ["trie", "hash-set", "sorting"]
---
# Longest Word in Dictionary

## Problem

Given an array of strings `words` representing a dictionary, find the longest word that can be built incrementally, one character at a time, where each intermediate prefix also exists as a complete word in the dictionary.

Here's what "built incrementally" means: starting from a single character, you can only add one more character if the resulting string also exists in `words`. For example, if `words = ["w", "wo", "wor", "worl", "world"]`, then "world" can be built incrementally because each prefix ("w", "wo", "wor", "worl") is itself a word in the dictionary. However, if "wor" were missing, then "world" would not qualify because you couldn't build past "wo".

The key constraint is that **all prefixes** must exist, not just the immediate parent. This means a word like "apple" requires the presence of "a", "ap", "app", "appl", and "apple" in the dictionary. If any link in this chain is missing, the word cannot be built incrementally.

When multiple words have the same maximum length and can be built incrementally, return the lexicographically smallest one (earliest in alphabetical order). For example, between "apply" and "apple", both of length 5, choose "apple" because 'e' comes before 'y'. If no valid word exists (for instance, if all words are longer than one character and no single-character words exist), return an empty string.

This problem tests your ability to verify dependencies efficiently. A naive approach checking all prefixes for each word would work but might be slow. Consider how sorting the words or using a Trie data structure could help verify the incremental construction property more elegantly.

## Why This Matters

This problem models how autocomplete systems and spell checkers build valid suggestions incrementally. It's also similar to how word games like Scrabble validate moves—checking whether intermediate letter combinations are valid. The pattern of verifying "can this be built from smaller valid pieces" appears in dependency resolution systems (like package managers ensuring all dependencies are installed), incremental compiler design, and validating certificate chains in security protocols. Learning to efficiently check prefix relationships prepares you for working with Trie data structures, which power text search in databases and editors.

## Examples

**Example 1:**
- Input: `words = ["w","wo","wor","worl","world"]`
- Output: `"world"`
- Explanation: "world" can be constructed incrementally through the prefix sequence: "w", "wo", "wor", "worl".

**Example 2:**
- Input: `words = ["a","banana","app","appl","ap","apply","apple"]`
- Output: `"apple"`
- Explanation: Both "apply" and "apple" satisfy the incremental construction requirement. Since they have equal length, "apple" wins due to lexicographic ordering.

## Constraints

- 1 <= words.length <= 1000
- 1 <= words[i].length <= 30
- words[i] consists of lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Understanding "Built One Character at a Time"</summary>

A word can be built one character at a time if ALL its prefixes exist in the dictionary. For example:
- "world" can be built if "w", "wo", "wor", "worl" all exist
- "apply" can be built if "a", "ap", "app", "appl" all exist

The key insight: we can check this incrementally. If we process words in order of increasing length, a word is valid only if its immediate prefix (word minus last character) has already been validated.

This suggests sorting by length first, then checking each word's prefix.
</details>

<details>
<summary>Hint 2: Hash Set Approach</summary>

Algorithm:
1. Sort words by length (shortest first), and lexicographically for tie-breaking
2. Use a hash set to track valid words (words that can be built incrementally)
3. Initialize the set with empty string "" or single-character words
4. For each word in sorted order:
   - Check if its prefix (word[:-1]) exists in the valid set
   - If yes, add current word to valid set and update answer if it's longer (or lexicographically smaller with same length)
5. Return the answer

Why this works: By processing shorter words first, we ensure that when we check a word, all its potential prefixes have already been processed.

Time: O(n log n + n * L) where L is average word length
Space: O(n * L) for the hash set
</details>

<details>
<summary>Hint 3: Trie Approach</summary>

A Trie (prefix tree) is perfect for this problem:

1. Build a Trie from all words, marking end-of-word nodes
2. Perform DFS/BFS from root, only traversing to children if the current node is marked as end-of-word
3. Track the longest path where every node on the path is marked as end-of-word
4. For tie-breaking, traverse children in alphabetical order (a to z)

Why this works: The Trie naturally represents prefix relationships. By only continuing DFS when current node is end-of-word, we ensure every prefix is valid.

Time: O(n * L) to build Trie + O(n * L) for DFS
Space: O(n * L) for Trie

This is more elegant but slightly more complex to implement than the hash set approach.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (check all prefixes) | O(n² * L) | O(n * L) | For each word, check all prefixes exist |
| Sort + Hash Set | O(n log n + n * L) | O(n * L) | Sort by length, then incremental validation |
| Trie + DFS | O(n * L) | O(n * L) | Build Trie, DFS with end-of-word checking |
| Optimal | O(n * L) | O(n * L) | Trie approach is asymptotically optimal |

## Common Mistakes

**Mistake 1: Not checking all prefixes**
```python
# Wrong - only checks if parent word exists, not all prefixes
def longestWord(words):
    word_set = set(words)
    result = ""

    for word in words:
        # Only checks immediate prefix, not all prefixes
        if len(word) == 1 or word[:-1] in word_set:
            if len(word) > len(result) or (len(word) == len(result) and word < result):
                result = word

    return result
    # Fails: ["a", "app", "apple"] returns "apple" but "ap" doesn't exist
```

**Mistake 2: Incorrect sorting for tie-breaking**
```python
# Wrong - doesn't sort lexicographically for same length
def longestWord(words):
    words.sort(key=len)  # Only sorts by length
    valid = {""}
    result = ""

    for word in words:
        if word[:-1] in valid:
            valid.add(word)
            if len(word) > len(result):  # Missing lexicographic tie-breaker
                result = word

    return result
    # When multiple words have same max length, returns arbitrary one
```

**Mistake 3: Not initializing valid set correctly**
```python
# Wrong - doesn't handle single-character words properly
def longestWord(words):
    valid = set()  # Should initialize with "" or single chars
    result = ""
    words.sort(key=lambda x: (len(x), x))

    for word in words:
        if len(word) == 1:  # Special case, but incomplete
            valid.add(word)
            result = word if len(word) > len(result) else result
        elif word[:-1] in valid:
            valid.add(word)
            if len(word) > len(result) or (len(word) == len(result) and word < result):
                result = word

    return result
    # Works but inelegant; better to initialize valid = {""}
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Longest Word with All Prefixes | Easy | Same problem, simpler constraints |
| Word Search II | Hard | Find all dictionary words in 2D grid |
| Longest Happy String | Medium | Different constraint (no three consecutive same chars) |
| Longest String Chain | Medium | Words differ by exactly one character, not incremental prefix |
| Maximum Length Word | Medium | Build word from character set with constraints |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Reviewed solution
- [ ] Practiced again (1 day later)
- [ ] Practiced again (3 days later)
- [ ] Practiced again (1 week later)
- [ ] Can solve in under 25 minutes
- [ ] Can explain solution clearly
- [ ] Implemented both hash set and Trie approaches
- [ ] Handled lexicographic tie-breaking correctly
- [ ] Tested with single-character words and empty result cases

**Strategy**: See [Trie Pattern](../strategies/data-structures/trie.md)
