---
id: M372
old_id: A212
slug: prefix-and-suffix-search
title: Prefix and Suffix Search
difficulty: medium
category: medium
topics: ["string", "trie", "design"]
patterns: ["trie", "hash-map"]
estimated_time_minutes: 30
frequency: medium
related_problems:
  - id: E032
    title: Implement Trie (Prefix Tree)
    difficulty: easy
  - id: M066
    title: Design Add and Search Words Data Structure
    difficulty: medium
  - id: M296
    title: Replace Words
    difficulty: medium
prerequisites:
  - Trie Data Structure
  - String Manipulation
  - Hash Maps
  - Design Patterns
strategy_ref: ../prerequisites/trie.md
---
# Prefix and Suffix Search

## Problem

Design a specialized search system that can find words matching both a prefix (beginning pattern) and a suffix (ending pattern) simultaneously. This dual-constraint search is more challenging than traditional prefix-only searches.

You'll implement a `WordFilter` class with two key operations:

1. **Constructor: `WordFilter(string[] words)`**
   Takes an array of words and builds your internal search structure. You can preprocess the words in any way that makes queries efficient. The array indices matter because they determine priority when multiple words match.

2. **Query: `f(string pref, string suff)`**
   Searches for a word that starts with the string `pref` AND ends with the string `suff`. For example, if `pref = "app"` and `suff = "le"`, the word "apple" would match. When multiple words satisfy both conditions, return the index of the word that appears latest (highest index) in the original array. If no word matches both criteria, return `-1`.

The key challenge is handling the "AND" constraint efficiently. A word like "application" matches prefix "app" and suffix "ion", but not suffix "le". You need to find words satisfying both conditions simultaneously, not separately.

Note that prefixes and suffixes can overlap or even be identical. For instance, "test" starts with "te" and ends with "st", but also starts and ends with "test" itself.

## Why This Matters

This problem appears in autocomplete systems where users filter by both how words start and end (like searching for files by extension and name prefix), or in dictionary applications with morphological search (finding words by prefix and suffix in linguistics). It teaches advanced data structure design, particularly the trie data structure and the clever "wrapper" technique for combining multiple search constraints. Understanding the space-time tradeoffs between hash maps and tries is essential for building scalable search systems. Companies working on search engines, code editors with intelligent autocomplete, or natural language processing tools frequently encounter these dual-constraint matching problems.

## Constraints

- 1 <= words.length <= 10⁴
- 1 <= words[i].length <= 7
- 1 <= pref.length, suff.length <= 7
- words[i], pref and suff consist of lowercase English letters only.
- At most 10⁴ calls will be made to the function f.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Brute Force and Preprocessing Tradeoff</summary>

The naive approach is to iterate through all words for each query and check if each word starts with `pref` and ends with `suff`. This takes O(n * m) per query where n is the number of words and m is the average word length.

Since you can have up to 10^4 queries, preprocessing is worth it. Consider what data structures enable fast prefix and suffix lookups:
- **Trie**: Efficient for prefix searches
- **Hash Map**: Can store precomputed combinations
- **Suffix Array/Tree**: Efficient for suffix searches

Think about how to combine these approaches or create a hybrid structure.

</details>

<details>
<summary>Hint 2: Wrapper Trick - Combine Prefix and Suffix</summary>

A clever approach: for each word, create all possible combinations of its suffixes and prefixes.

For word "apple" at index i, create entries like:
- "apple#apple"
- "pple#apple"
- "ple#apple"
- "le#apple"
- "e#apple"
- "#apple"

Store these in a trie. When querying for suffix "le" and prefix "app", search for "le#app" in the trie.

This transforms the two-dimensional search (prefix AND suffix) into a single prefix search problem.

</details>

<details>
<summary>Hint 3: Hash Map with Combined Keys</summary>

A simpler but more space-intensive approach: during construction, generate all possible (prefix, suffix) pairs for each word and store them in a hash map.

For word "apple" at index 5:
- ("a", "e") -> 5
- ("a", "le") -> 5
- ("ap", "e") -> 5
- ... (all combinations)

When querying `f(pref, suff)`, simply look up `map[(pref, suff)]` and return the maximum index.

This has O(1) query time but requires O(n * m^2) space and preprocessing time where m is word length.

</details>

## Complexity Analysis

| Approach | Time Complexity (Query) | Time Complexity (Build) | Space Complexity | Notes |
|----------|------------------------|------------------------|------------------|-------|
| Brute Force | O(n * m) | O(1) | O(n * m) | Check every word |
| Hash Map All Pairs | O(1) | O(n * m^2) | O(n * m^2) | Store all prefix-suffix combinations |
| Trie with Wrapper | O(m) | O(n * m^2) | O(n * m^2) | Wrapper trick: "suffix#prefix" |
| Two Tries | O(m * k) | O(n * m) | O(n * m) | k = matching candidates, complex merge |

## Common Mistakes

### Mistake 1: Not Handling Multiple Matches Correctly
```python
# Wrong: Returning first match instead of latest index
class WordFilter:
    def __init__(self, words):
        self.map = {}
        for i, word in enumerate(words):
            for p in range(len(word) + 1):
                for s in range(len(word) + 1):
                    prefix = word[:p]
                    suffix = word[s:]
                    self.map[(prefix, suffix)] = i  # This is actually correct!

    def f(self, pref, suff):
        # But if we used a list and returned first:
        # return self.map.get((pref, suff), [None])[0]  # Wrong!
        return self.map.get((pref, suff), -1)
```

**Fix:** Since we iterate words in order and overwrite, later indices naturally replace earlier ones:
```python
# Correct: Overwriting ensures we keep the latest index
for i, word in enumerate(words):
    # ... generate pairs ...
    self.map[(prefix, suffix)] = i  # Overwrites earlier indices
```

### Mistake 2: Incorrect Prefix/Suffix Generation
```python
# Wrong: Not including empty prefix/suffix
for p in range(1, len(word)):  # Starts at 1, misses empty prefix
    for s in range(1, len(word)):  # Starts at 1, misses empty suffix
        prefix = word[:p]
        suffix = word[s:]
```

**Fix:** Include empty string cases:
```python
# Correct: Include empty prefix and suffix
for p in range(len(word) + 1):  # 0 to len(word)
    for s in range(len(word) + 1):  # 0 to len(word)
        prefix = word[:p]  # word[:0] = ""
        suffix = word[s:]  # word[len:] = ""
```

### Mistake 3: Wrapper String Format Error
```python
# Wrong: Incorrect separator or order
def __init__(self, words):
    self.trie = Trie()
    for i, word in enumerate(words):
        # Wrong order: should be suffix#prefix for lookup to work
        for suffix in all_suffixes(word):
            self.trie.insert(f"{word}#{suffix}", i)

def f(self, pref, suff):
    return self.trie.search(f"{pref}#{suff}")  # Won't match
```

**Fix:** Use consistent format:
```python
# Correct: suffix#prefix format
def __init__(self, words):
    self.trie = Trie()
    for i, word in enumerate(words):
        for suffix in all_suffixes(word):
            # Store as "suffix#prefix" for each prefix
            for prefix in all_prefixes(word):
                self.trie.insert(f"{suffix}#{prefix}", i)

def f(self, pref, suff):
    return self.trie.search(f"{suff}#{pref}")  # Matches format
```

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Prefix and Suffix Search (Range) | Return all matching indices, not just latest | Medium |
| Wildcard Prefix/Suffix Search | Allow `*` wildcards in queries | Hard |
| Top K Matching Words | Return K words with highest indices | Medium |
| Case-Insensitive Search | Handle mixed case inputs | Easy |
| Multi-Pattern Search | Query multiple prefix-suffix pairs at once | Hard |

## Practice Checklist

- [ ] First attempt (within 30 minutes)
- [ ] Implement hash map solution
- [ ] Understand wrapper trick optimization
- [ ] Handle edge cases (empty strings, no matches)
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Can explain space-time tradeoffs
- [ ] Attempted wildcard variation

**Strategy**: See [Trie Pattern](../prerequisites/trie.md)
