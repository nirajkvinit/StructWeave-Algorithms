---
id: M305
old_id: A115
slug: replace-words
title: Replace Words
difficulty: medium
category: medium
topics: ["string", "trie", "hash-table"]
patterns: ["trie", "string-manipulation"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M208", "M648", "M720"]
prerequisites: ["M208", "E014"]
---
# Replace Words

## Problem

In English morphology, root words form the base of longer derivative words. For example, the root "help" can become "helper", "helping", or "helpful" by adding suffixes. Given a dictionary of root words and a sentence, replace each word in the sentence with the shortest applicable root from the dictionary.

More specifically: you receive a `dictionary` array containing root words and a `sentence` string with space-separated words. For each word in the sentence, if a root from the dictionary appears as a prefix of that word, replace the entire word with that root. When multiple roots could apply to a single word (one root is a prefix of another, and both are prefixes of the word), always use the shortest root.

For example, with dictionary `["cat", "bat", "rat"]` and sentence `"the cattle was rattled by the battery"`, the word "cattle" starts with root "cat", "rattled" starts with root "rat", and "battery" starts with root "bat". After replacement, you get `"the cat was rat by the bat"`.

Important edge case: if no root matches a word, leave that word unchanged. Also, roots are applied based on prefix matching - "cat" matches "cattle" but not "scat" (prefix must start from the beginning).

## Why This Matters

This problem teaches efficient prefix matching using tries, a fundamental technique in autocomplete systems, spell checkers, and natural language processing. Tries excel at finding common prefixes among thousands of words in logarithmic time, making them essential for text prediction, search suggestions, and linguistic analysis tools like stemming algorithms (which reduce words to their roots for search indexing). The pattern of "find shortest matching prefix" appears in routing tables, IP address matching, and URL shortening systems. Understanding when to use a trie versus a hash set teaches you to balance implementation complexity against performance needs.

## Examples

**Example 1:**
- Input: `dictionary = ["cat","bat","rat"], sentence = "the cattle was rattled by the battery"`
- Output: `"the cat was rat by the bat"`

**Example 2:**
- Input: `dictionary = ["a","b","c"], sentence = "aadsfasf absbs bbab cadsfafs"`
- Output: `"a a b c"`

## Constraints

- 1 <= dictionary.length <= 1000
- 1 <= dictionary[i].length <= 100
- dictionary[i] consists of only lower-case letters.
- 1 <= sentence.length <= 10⁶
- sentence consists of only lower-case letters and spaces.
- The number of words in sentence is in the range [1, 1000]
- The length of each word in sentence is in the range [1, 1000]
- Every two consecutive words in sentence will be separated by exactly one space.
- sentence does not have leading or trailing spaces.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Use Trie for Efficient Prefix Matching</summary>

A Trie (prefix tree) is perfect for this problem because we need to find the shortest root that is a prefix of each word.

Build a trie from the dictionary roots:
- Each path from root to a terminal node represents a root word
- Mark terminal nodes to indicate complete roots

For each word in the sentence:
- Traverse the trie character by character
- Stop at the first terminal node (shortest root)
- If found, replace with that root; otherwise keep original word

Time: O(D × L₁ + S × L₂) where D=dictionary size, S=sentence words, L₁=avg root length, L₂=avg word length.

</details>

<details>
<summary>Hint 2: Alternative Hash Set Approach</summary>

If the constraints allow, you can use a hash set with prefix checking:

1. Add all roots to a hash set
2. For each word in the sentence:
   - Check prefixes of increasing length (1, 2, 3, ...)
   - If prefix exists in set, use it as replacement
   - Stop at first match (shortest root)

```python
roots = set(dictionary)
result = []
for word in sentence.split():
    prefix = word
    for i in range(1, len(word) + 1):
        if word[:i] in roots:
            prefix = word[:i]
            break
    result.append(prefix)
return ' '.join(result)
```

Time: O(W × L²) for hash lookups, where W=words, L=avg word length. Less efficient than trie for large L.

</details>

<details>
<summary>Hint 3: Optimize Trie Lookup</summary>

Trie implementation tips:

1. **Early termination**: Stop traversing as soon as you hit a terminal node (shortest root)
2. **Store root at node**: Instead of reconstructing, store the root string at each terminal node
3. **Handle missing paths**: If current character has no child, the word has no root replacement

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.root = None  # Store the root string here

def find_root(trie, word):
    node = trie
    for i, char in enumerate(word):
        if char not in node.children:
            return word  # No root found
        node = node.children[char]
        if node.root:  # Found a root (shortest due to early return)
            return node.root
    return word  # Word itself is not a root
```

This approach is clean and optimal for this problem.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Trie | O(D×L₁ + S×L₂) | O(D×L₁) | D=dict size, S=sentence words, L=lengths; optimal |
| Hash Set + Prefix Check | O(S×L²) | O(D×L₁) | Simpler but slower for long words |
| Brute Force | O(D×S×L) | O(1) | Check each root against each word |

**Recommended**: Trie for optimal performance, hash set for simpler implementation if time allows.

## Common Mistakes

1. **Not finding shortest root**
```python
# Wrong: Returning first root found, not shortest
roots = set(dictionary)
for word in sentence.split():
    for root in roots:
        if word.startswith(root):
            result.append(root)
            break  # Wrong! May not be shortest

# Correct: Check all prefixes in order of length
for word in sentence.split():
    replaced = word
    for i in range(1, len(word) + 1):
        if word[:i] in roots:
            replaced = word[:i]
            break  # First match is shortest
    result.append(replaced)
```

2. **Inefficient string concatenation**
```python
# Wrong: Using string concatenation in loop
result = ""
for word in sentence.split():
    root = find_root(word)
    result += root + " "  # O(n) per operation, O(n²) total

# Correct: Use list and join
result = []
for word in sentence.split():
    root = find_root(word)
    result.append(root)
return " ".join(result)  # O(n) total
```

3. **Not handling edge cases**
```python
# Wrong: Assuming all words have roots
def replace_words(dictionary, sentence):
    trie = build_trie(dictionary)
    return " ".join(find_root(trie, word) for word in sentence.split())
    # What if find_root returns None?

# Correct: Return original word if no root found
def find_root(trie, word):
    node = trie
    for char in word:
        if char not in node.children:
            return word  # No root, return original
        node = node.children[char]
        if node.is_end:
            return node.root
    return word  # No root found
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Longest Common Prefix | Easy | Find longest common prefix of all words |
| Word Break | Medium | Check if sentence can be segmented using dictionary |
| Word Squares | Hard | Find all word squares from given words |
| Implement Trie II | Medium | Trie with prefix counting and deletion |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Implement basic trie structure (insert, search, prefix search)
- [ ] Build trie from dictionary with terminal node marking
- [ ] Implement find_root function with early termination
- [ ] Handle edge cases (no root found, empty sentence, empty dictionary)
- [ ] Optimize by storing root string at terminal nodes
- [ ] Compare trie vs hash set approach in terms of complexity
- [ ] Review after 1 day: Can you recall trie structure?
- [ ] Review after 1 week: Implement without looking at notes
- [ ] Review after 1 month: Solve M648 (Replace Words II) if available

**Strategy**: See [Trie Pattern](../strategies/data-structures/tries.md)
