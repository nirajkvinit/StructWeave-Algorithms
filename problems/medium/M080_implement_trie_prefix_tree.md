---
id: M080
old_id: I008
slug: implement-trie-prefix-tree
title: Implement Trie (Prefix Tree)
difficulty: medium
category: medium
topics: ["trie"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../prerequisites/tries.md
frequency: high
related_problems: ["M083", "M211", "M212"]
prerequisites: ["tree-data-structures", "hash-tables", "object-oriented-design"]
---
# Implement Trie (Prefix Tree)

## Problem

A trie (pronounced "try") is a specialized tree data structure optimized for storing and retrieving strings, particularly useful when many strings share common prefixes. Unlike storing complete strings in a hash set, a trie stores each character as a node in a tree, with paths from root to nodes spelling out words. For example, storing "cat," "car," and "card" creates a single path c→a→t with branches at 't' leading to additional characters. Implement a Trie class supporting three operations: insert(word) to add a word, search(word) to check if an exact word exists (not just a prefix), and startsWith(prefix) to check if any word begins with the given prefix. Each node needs to track its children (the next possible characters) and whether it marks the end of a complete word. Consider using a hash map for children (flexible but slower) or an array of size 26 (faster for lowercase letters only). Edge cases include single-character words, checking for words that are prefixes of other words, and empty string handling.

## Why This Matters

Tries power the autocomplete features in search engines, IDEs, and mobile keyboards that you use every day. When you type "pro" into Google and see suggestions like "programming," "project," and "protein," a trie enables instant prefix matching across millions of terms. Code editors use tries to provide intelligent autocomplete for variable names and function names as you type, searching symbol tables efficiently. Spell checkers employ tries to validate words and generate correction suggestions by exploring nearby paths in the trie. IP routing tables in network routers use trie structures (prefix trees) to match IP addresses to routes efficiently, handling millions of packets per second. DNS servers use tries to resolve domain names quickly by matching prefixes. Genome sequencing tools use tries to index and search DNA subsequences. The trie's ability to share common prefixes makes it extraordinarily space-efficient for dictionaries with many similar words, and its O(m) lookup time (where m is string length, not dictionary size) makes it ideal for real-time applications where milliseconds matter.

## Constraints

- 1 <= word.length, prefix.length <= 2000
- word and prefix consist only of lowercase English letters.
- At most 3 * 10⁴ calls **in total** will be made to insert, search, and startsWith.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Tree Node Structure</summary>

Each node in the trie represents a character position, not the character itself. Think about what information each node needs to store:
- Links to child nodes (one for each possible character)
- A flag indicating whether this node marks the end of a complete word

You can use an array of size 26 for children (for 'a'-'z'), or a hash map for more flexibility.

</details>

<details>
<summary>🎯 Hint 2: Common Prefix Insight</summary>

The power of a trie is that words sharing common prefixes share the same path through the tree. For example, "car", "card", and "care" all share the path c->a->r, then diverge. This makes prefix operations extremely efficient compared to storing complete strings.

</details>

<details>
<summary>📝 Hint 3: Implementation Steps</summary>

TrieNode class:
```
class TrieNode:
    - children: array[26] or hashmap
    - isEndOfWord: boolean
```

Insert operation:
1. Start at root
2. For each character in word:
   - If child node doesn't exist, create it
   - Move to child node
3. Mark final node as end of word

Search operation:
1. Start at root
2. For each character:
   - If child doesn't exist, return false
   - Move to child
3. Return whether final node is marked as end of word

StartsWith operation:
1. Same as search, but don't check isEndOfWord flag
2. Just verify path exists for all characters

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Array Storage | O(n×m) insert, O(n×m) search | O(n×m) | Store all words in array, m=avg word length, n=num words |
| Hash Set | O(m) insert, O(m) search | O(n×m) | Simple but startsWith requires scanning all words |
| **Trie with Array** | **O(m)** | **O(ALPHABET × n × m)** | Optimal time, more space. ALPHABET=26 for lowercase |
| Trie with HashMap | O(m) | O(n×m) | Space efficient, slightly slower due to hash overhead |

## Common Mistakes

**Mistake 1: Confusing search and startsWith**

```python
# Wrong - Using same logic for both
class Trie:
    def search(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                return False
            node = node.children[char]
        return True  # Wrong! Should check isEndOfWord

    def startsWith(self, prefix):
        node = self.root
        for char in prefix:
            if char not in node.children:
                return False
            node = node.children[char]
        return node.isEndOfWord  # Wrong! Shouldn't check flag
```

```python
# Correct - Different end conditions
class Trie:
    def search(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                return False
            node = node.children[char]
        return node.isEndOfWord  # Must be a complete word

    def startsWith(self, prefix):
        node = self.root
        for char in prefix:
            if char not in node.children:
                return False
            node = node.children[char]
        return True  # Path exists is enough
```

**Mistake 2: Not initializing nodes properly**

```python
# Wrong - Forgetting to initialize children
class TrieNode:
    def __init__(self):
        self.isEndOfWord = False
        # Missing: self.children = {}

class Trie:
    def insert(self, word):
        node = self.root
        for char in word:
            if char not in node.children:  # Will error!
                node.children[char] = TrieNode()
```

```python
# Correct - Proper initialization
class TrieNode:
    def __init__(self):
        self.children = {}  # or [None] * 26 for array
        self.isEndOfWord = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.isEndOfWord = True
```

**Mistake 3: Using string indices instead of hash map for flexibility**

```python
# Rigid - Only works for lowercase a-z
class TrieNode:
    def __init__(self):
        self.children = [None] * 26  # Assumes only a-z
        self.isEndOfWord = False

    def insert(self, char):
        idx = ord(char) - ord('a')
        # Fails for uppercase, numbers, special chars
```

```python
# Flexible - Works for any characters
class TrieNode:
    def __init__(self):
        self.children = {}  # Can handle any character
        self.isEndOfWord = False

    # OR for performance with known alphabet:
    def __init__(self):
        self.children = [None] * 26  # But document assumption
        self.isEndOfWord = False
        # And validate input is lowercase a-z
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Add and Search Word | Medium | Support wildcard '.' that matches any character |
| Word Search II | Hard | Find all dictionary words in a 2D board using trie |
| Design Search Autocomplete | Hard | Return top k suggestions with each character typed |
| Palindrome Pairs | Hard | Find pairs of words that form palindromes |
| Replace Words | Medium | Replace words with shortest root from dictionary |

## Practice Checklist

- [ ] Day 1: Implement using hash map for children
- [ ] Day 2: Implement using array[26] for children, compare tradeoffs
- [ ] Day 7: Re-solve from scratch without looking at previous code
- [ ] Day 14: Solve "Add and Search Word" using trie with wildcards
- [ ] Day 30: Implement additional methods (delete, countWords, countPrefixes)

**Strategy**: See [Trie Pattern](../prerequisites/tries.md)
