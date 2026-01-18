---
id: M083
old_id: I011
slug: design-add-and-search-words-data-structure
title: Design Add and Search Words Data Structure
difficulty: medium
category: medium
topics: ["trie", "design"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems: ["M080", "M212", "M211"]
prerequisites: ["trie-data-structure", "backtracking", "recursion"]
---
# Design Add and Search Words Data Structure

## Problem

Create a structure to store words and perform flexible pattern matching with wildcard support. You'll implement the `WordDictionary` class with three operations. First, `WordDictionary()` initializes an empty data structure. Second, `void addWord(word)` stores a word so it can be searched later, where words consist of lowercase English letters. Third, `bool search(word)` returns `true` if any stored word matches the search pattern, or `false` otherwise. The challenge lies in the search operation: the pattern may contain dots `'.'` where each dot acts as a wildcard that can match any single letter. For example, searching ".ad" would match "bad", "dad", and "mad", while "b.." would match "bat", "bay", and "box". Unlike simple string matching, you need to handle multiple possible matches simultaneously when encountering wildcards. Edge cases include searching with no wildcards (exact match), searching with all wildcards (match any word of that length), and searching when no stored words match the pattern.

## Why This Matters

Wildcard pattern matching powers autocomplete features in search engines, IDEs, and command-line interfaces. Text editors use similar techniques for find-and-replace with pattern support, enabling users to locate variations of a word without typing each one explicitly. Spell checkers employ pattern matching to suggest corrections when you've mistyped a few characters. Regular expression engines build on these concepts to provide powerful text processing capabilities. In bioinformatics, researchers search DNA sequences with wildcards to find gene patterns where certain positions can vary. Log analysis tools use pattern matching to filter error messages with variable components like timestamps or user IDs. This problem teaches you to combine trie data structures with backtracking, a powerful combination that appears in dictionary implementations, word games, and any system requiring efficient prefix-based search with flexibility for partial matches.

## Constraints

- 1 <= word.length <= 25
- word in addWord consists of lowercase English letters.
- word in search consist of '.' or lowercase English letters.
- There will be at most 2 dots in word for search queries.
- At most 10⁴ calls will be made to addWord and search.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Build on Trie Foundation</summary>

This extends the basic Trie implementation. The addWord operation is identical to a standard trie insert. The challenge is in the search operation when encountering a wildcard '.', which can match any single character. You'll need to explore multiple branches simultaneously.

</details>

<details>
<summary>🎯 Hint 2: Wildcard Handling Strategy</summary>

When searching and you encounter a '.':
- You must explore ALL possible child nodes at that level
- This requires backtracking or recursion
- For each child, continue searching the rest of the pattern
- Return true if ANY path succeeds

For regular characters, just follow the single matching path as in standard trie.

</details>

<details>
<summary>📝 Hint 3: Recursive Search Implementation</summary>

Pseudocode for search with wildcards:
```
def search(word, node=root, index=0):
    if index == word.length:
        return node.isEndOfWord

    char = word[index]

    if char == '.':
        // Wildcard: try all children
        for each child in node.children:
            if search(word, child, index + 1):
                return true
        return false
    else:
        // Regular char: follow single path
        if char not in node.children:
            return false
        return search(word, node.children[char], index + 1)
```

Time: O(M) for addWord, O(N × 26^K) for search where K is number of dots
Space: O(total characters stored)

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Array Storage | O(n×m) add, O(n×m×k) search | O(n×m) | Linear search through all words for wildcards |
| Hash Set | O(m) add, O(n×m) search | O(n×m) | Fast add, but search must check all words |
| **Trie with Backtracking** | **O(m) add, O(26^k × m)** | **O(ALPHABET × total chars)** | Optimal for prefix operations, k = num wildcards |
| DFS on Trie | O(m) add, O(26^k × m) search | O(m) recursion depth | Same as backtracking, clearer conceptually |

## Common Mistakes

**Mistake 1: Not handling wildcard recursively**

```python
# Wrong - Trying to handle wildcards iteratively
class WordDictionary:
    def search(self, word):
        node = self.root
        for char in word:
            if char == '.':
                # Can't just pick one child - need to try all!
                node = node.children[0]  # Wrong approach
            elif char in node.children:
                node = node.children[char]
            else:
                return False
        return node.isEndOfWord
```

```python
# Correct - Recursive wildcard handling
class WordDictionary:
    def search(self, word):
        return self._search_helper(word, self.root, 0)

    def _search_helper(self, word, node, index):
        if index == len(word):
            return node.isEndOfWord

        char = word[index]

        if char == '.':
            # Try all possible children
            for child in node.children.values():
                if self._search_helper(word, child, index + 1):
                    return True
            return False
        else:
            if char not in node.children:
                return False
            return self._search_helper(word, node.children[char], index + 1)
```

**Mistake 2: Forgetting to check isEndOfWord at the end**

```python
# Wrong - Doesn't verify complete word
class WordDictionary:
    def _search_helper(self, word, node, index):
        if index == len(word):
            return True  # Wrong! Must check isEndOfWord

        # ... rest of implementation
```

```python
# Correct - Verify end of word marker
class WordDictionary:
    def _search_helper(self, word, node, index):
        if index == len(word):
            return node.isEndOfWord  # Correct

        char = word[index]
        # ... rest of implementation
```

**Mistake 3: Not handling empty children dictionary**

```python
# Wrong - Crashes when no children exist
class WordDictionary:
    def _search_helper(self, word, node, index):
        if index == len(word):
            return node.isEndOfWord

        char = word[index]

        if char == '.':
            for child in node.children.values():  # Empty dict is fine
                if self._search_helper(word, child, index + 1):
                    return True
            return False  # Returns False for empty dict - correct!
```

```python
# Correct - Python handles empty dict iteration gracefully
class WordDictionary:
    def _search_helper(self, word, node, index):
        if index == len(word):
            return node.isEndOfWord

        char = word[index]

        if char == '.':
            # This works correctly even if children is empty
            for child in node.children.values():
                if self._search_helper(word, child, index + 1):
                    return True
            return False
        else:
            if char not in node.children:
                return False
            return self._search_helper(word, node.children[char], index + 1)
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Implement Trie | Medium | Basic trie without wildcard support |
| Word Search II | Hard | Find all dictionary words in a 2D board |
| Regular Expression Matching | Hard | Support '.' and '*' wildcards |
| Wildcard Matching | Hard | Support '?' and '*' wildcards in patterns |
| Match Substring After Replacement | Hard | Match with character replacements allowed |

## Practice Checklist

- [ ] Day 1: Implement with recursive wildcard search
- [ ] Day 2: Try iterative approach with explicit stack (harder)
- [ ] Day 7: Re-solve from scratch, focus on base case handling
- [ ] Day 14: Extend to support '*' wildcard (matches zero or more chars)
- [ ] Day 30: Optimize by pruning impossible branches early

**Strategy**: See [Trie with Backtracking Pattern](../strategies/data-structures/tries.md)
