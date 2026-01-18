---
id: M324
old_id: A143
slug: implement-magic-dictionary
title: Implement Magic Dictionary
difficulty: medium
category: medium
topics: ["array", "string", "hash-table", "trie"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems: ["E720", "M208", "M676"]
prerequisites: ["hash-table", "trie", "string-matching"]
---
# Implement Magic Dictionary

## Problem

Design a data structure called `MagicDictionary` that stores words and can answer a specific type of query: given a search word, determine if changing exactly one character in that word would produce a word that exists in the dictionary.

For example, if your dictionary contains "hello", then searching "hallo" should return true (changing the second 'a' to 'e' gives "hello"), but searching "hello" itself should return false (you must change exactly one character, not zero). Similarly, searching "help" would return false because no single character change can produce "hello".

Your `MagicDictionary` class needs three methods:

- `MagicDictionary()`: Constructor to initialize an empty dictionary
- `void buildDict(String[] dictionary)`: Stores all words from the input array (each word is unique)
- `bool search(String searchWord)`: Returns true if modifying exactly one character in `searchWord` creates a match with any stored word

The key challenge is efficiency. A naive approach would compare the search word against every dictionary word character-by-character, but with up to 100 dictionary words and 100 search calls, you want something faster. The problem invites you to explore data structures like hash tables with pattern-based keys or tries with wildcard matching.

Note the "exactly one" requirement carefully: zero changes (exact match) doesn't count, and neither do multiple changes. Words must also have the same length to be one character apart.

## Why This Matters

This problem teaches you to design specialized data structures for specific query patterns. The "one character away" relationship appears in spell checkers (suggesting corrections), fuzzy matching in search engines, DNA sequence analysis (single-nucleotide polymorphisms), and error-tolerant password systems.

The problem also reinforces the trade-off between preprocessing time and query time. By investing more work upfront in `buildDict` (creating patterns or building a trie), you can make `search` operations faster. Understanding these trade-offs is essential for building responsive applications.

Finally, this problem introduces wildcard patterns and approximate string matching, techniques that appear in regular expressions, database LIKE queries, and pattern recognition systems.

## Constraints

- 1 <= dictionary.length <= 100
- 1 <= dictionary[i].length <= 100
- dictionary[i] consists of only lower-case English letters.
- All the strings in dictionary are **distinct**.
- 1 <= searchWord.length <= 100
- searchWord consists of only lower-case English letters.
- buildDict will be called only once before search.
- At most 100 calls will be made to search.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Brute Force with String Comparison</summary>

For each search, compare the searchWord against every word in the dictionary:
- If lengths differ, they can't be one character apart
- If lengths match, count how many positions differ
- Return true if exactly one position differs

```python
class MagicDictionary:
    def __init__(self):
        self.words = []

    def buildDict(self, dictionary):
        self.words = dictionary

    def search(self, searchWord):
        for word in self.words:
            if len(word) != len(searchWord):
                continue
            diff_count = sum(a != b for a, b in zip(word, searchWord))
            if diff_count == 1:
                return True
        return False
```

Time: O(n × m) per search where n = number of words, m = word length.

</details>

<details>
<summary>Hint 2: Hash Set with Pattern Generation</summary>

Optimize using a hash set. For each word in the dictionary, generate all possible patterns with one wildcard character:

```python
class MagicDictionary:
    def __init__(self):
        self.patterns = set()
        self.words = set()

    def buildDict(self, dictionary):
        self.words = set(dictionary)
        for word in dictionary:
            for i in range(len(word)):
                # Create pattern with * at position i
                pattern = word[:i] + '*' + word[i+1:]
                self.patterns.add((pattern, len(word)))

    def search(self, searchWord):
        for i in range(len(searchWord)):
            pattern = searchWord[:i] + '*' + searchWord[i+1:]
            if (pattern, len(searchWord)) in self.patterns:
                # Make sure it's not the same word
                if searchWord not in self.words or self._has_other_match(searchWord, pattern):
                    return True
        return False
```

</details>

<details>
<summary>Hint 3: Trie with Wildcard Search</summary>

Use a Trie for efficient prefix-based searching. During search, allow exactly one mismatch:

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_word = False

class MagicDictionary:
    def __init__(self):
        self.root = TrieNode()

    def buildDict(self, dictionary):
        for word in dictionary:
            node = self.root
            for char in word:
                if char not in node.children:
                    node.children[char] = TrieNode()
                node = node.children[char]
            node.is_word = True

    def search(self, searchWord):
        def dfs(node, index, mismatches):
            if index == len(searchWord):
                return node.is_word and mismatches == 1

            char = searchWord[index]
            for next_char in node.children:
                if next_char == char:
                    if dfs(node.children[next_char], index + 1, mismatches):
                        return True
                elif mismatches == 0:
                    if dfs(node.children[next_char], index + 1, 1):
                        return True
            return False

        return dfs(self.root, 0, 0)
```

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force | buildDict: O(n), search: O(n×m) | O(n×m) | n = dict size, m = avg word length |
| Hash Set Patterns | buildDict: O(n×m²), search: O(m) | O(n×m²) | Store all patterns with wildcards |
| Trie with DFS | buildDict: O(n×m), search: O(26^m) worst | O(n×m) | Efficient for prefix sharing |
| Optimized Hash | buildDict: O(n×m), search: O(m) | O(n×m) | Best practical solution |

## Common Mistakes

**Mistake 1: Allowing the Same Word**
```python
# Wrong: Returning true for exact matches
def search(self, searchWord):
    for word in self.words:
        if word == searchWord:
            return True  # Wrong! Need exactly 1 change

# Correct: Ensure exactly 1 character differs
def search(self, searchWord):
    for word in self.words:
        if len(word) == len(searchWord):
            diff = sum(a != b for a, b in zip(word, searchWord))
            if diff == 1:  # Exactly 1, not 0
                return True
```

**Mistake 2: Not Handling Length Mismatch**
```python
# Wrong: Comparing different length words
def search(self, searchWord):
    for word in self.words:
        diff = sum(a != b for a, b in zip(word, searchWord))
        # zip truncates to shorter length!

# Correct: Check lengths first
if len(word) != len(searchWord):
    continue
```

**Mistake 3: Inefficient Pattern Generation**
```python
# Wrong: Regenerating patterns on every search
def search(self, searchWord):
    for word in self.words:
        for i in range(len(word)):
            # Repeatedly creating patterns for stored words

# Correct: Pre-generate patterns in buildDict
def buildDict(self, dictionary):
    for word in dictionary:
        for i in range(len(word)):
            pattern = word[:i] + '*' + word[i+1:]
            self.patterns.add(pattern)
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Allow k character changes | Medium | Generalize to k mismatches |
| Find closest word (min changes) | Medium | Return minimum edit distance |
| Support deletions/insertions | Hard | Full edit distance (not just substitution) |
| Stream of buildDict calls | Medium | Dynamic dictionary updates |
| Return all matching words | Medium | Return list instead of boolean |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Analyzed time/space complexity
- [ ] Solved without hints
- [ ] Tested edge cases (same word, no matches, single char words)
- [ ] Reviewed alternative approaches
- [ ] Practiced again after 1 day
- [ ] Practiced again after 1 week
- [ ] Could explain solution to others
