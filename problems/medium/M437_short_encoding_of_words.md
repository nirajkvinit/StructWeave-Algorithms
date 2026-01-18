---
id: M437
old_id: A287
slug: short-encoding-of-words
title: Short Encoding of Words
difficulty: medium
category: medium
topics: ["array", "string"]
patterns: []
estimated_time_minutes: 30
---
# Short Encoding of Words

## Problem

Given an array of words, find the shortest reference string that can encode all of them using a special suffix-based encoding scheme.

The encoding works by creating a reference string where words are concatenated and separated by `#` characters. Each word can be retrieved by specifying a starting index in the reference string and reading until the next `#`. For example, with reference string `"time#bell#"` and indices `[0, 5]`, you can decode `"time"` (from index 0 to the first `#`) and `"bell"` (from index 5 to the second `#`).

The key optimization is that if one word is a suffix of another, you only need to store the longer word. For instance, if your words array contains both `"time"` and `"me"`, you don't need separate entries because `"me"` is a suffix of `"time"`. Using just `"time#"` in your reference string, you can represent `"time"` with index 0 and `"me"` with index 2, both reading until the `#`.

Your goal is to determine the minimum length of such a reference string. Since each word requires a `#` terminator (which costs 1 character) plus the word's own length, the total length is the sum of `(length + 1)` for each word that isn't a suffix of another word in the array.

## Why This Matters

String compression and encoding schemes are fundamental in data storage optimization, network transmission, and memory-efficient data structures. This specific suffix-sharing pattern appears in trie data structures, used extensively in autocomplete systems, spell checkers, and IP routing tables. The problem teaches you to recognize redundancy through suffix relationships and use appropriate data structures (tries or set operations) to eliminate that redundancy. Real-world applications include minimizing storage for dictionary data, optimizing URL shortener databases, and compressing genomic sequence data where suffix overlap is common.

## Examples

**Example 1:**
- Input: `words = ["time", "me", "bell"]`
- Output: `10`
- Explanation: One valid encoding uses s = `"time#bell#" with indices = [0, 2, 5`].
words[0] = "time" is extracted from s starting at position indices[0] = 0 until the '#' delimiter
words[1] = "me" is extracted from s starting at position indices[1] = 2 until the '#' delimiter
words[2] = "bell" is extracted from s starting at position indices[2] = 5 until the '#' delimiter

**Example 2:**
- Input: `words = ["t"]`
- Output: `2`
- Explanation: A valid encoding would be s = "t#" and indices = [0].

## Constraints

- 1 <= words.length <= 2000
- 1 <= words[i].length <= 7
- words[i] consists of only lowercase letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
If one word is a suffix of another, it doesn't need its own entry in the reference string. For example, if you have "time" and "me", you only need "time#" since "me" is a suffix. Build a trie or use set operations to eliminate words that are suffixes of others.
</details>

<details>
<summary>🎯 Main Approach</summary>
Method 1 (Trie): Build a trie with words inserted in reverse. Words that end at non-leaf nodes are suffixes of others and can be removed. Sum the lengths of words ending at leaf nodes plus 1 for each '#'.

Method 2 (Set): Add all words to a set. For each word, try removing it by checking if any of its suffixes exist in the set. Count remaining words' lengths plus 1 for each '#'.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Using a set: for each word, remove all its proper suffixes from the set. The remaining words in the set are those needed. The answer is sum of (len(word) + 1) for all remaining words. Sort words by length descending to process longer words first.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Trie Solution | O(n * m) | O(n * m) | n = words count, m = avg word length |
| Set with Suffix Removal | O(n * m²) | O(n * m) | Check all suffixes for each word |
| Optimal | O(n * m) | O(n * m) | Trie is more efficient |

## Common Mistakes

1. **Not considering suffix relationships**
   ```python
   # Wrong: Counting all words independently
   total = sum(len(word) + 1 for word in words)

   # Correct: Remove words that are suffixes of others
   word_set = set(words)
   for word in words:
       for i in range(1, len(word)):
           word_set.discard(word[i:])  # Remove suffixes
   total = sum(len(word) + 1 for word in word_set)
   ```

2. **Incorrect trie construction**
   ```python
   # Wrong: Building trie in forward direction
   for word in words:
       node = root
       for char in word:
           node = node.children[char]

   # Correct: Build trie with reversed words to detect suffixes
   for word in words:
       node = root
       for char in reversed(word):
           if char not in node.children:
               node.children[char] = TrieNode()
           node = node.children[char]
   ```

3. **Forgetting to add 1 for each '#' character**
   ```python
   # Wrong: Only counting word lengths
   return sum(len(word) for word in unique_words)

   # Correct: Add 1 for the '#' after each word
   return sum(len(word) + 1 for word in unique_words)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Implement Trie | Medium | Basic trie construction |
| Word Search II | Hard | Trie with board search |
| Replace Words | Medium | Trie for prefix matching |
| Map Sum Pairs | Medium | Trie with value aggregation |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Trie](../../strategies/data-structures/trie.md)
