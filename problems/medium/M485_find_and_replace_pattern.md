---
id: M485
old_id: A357
slug: find-and-replace-pattern
title: Find and Replace Pattern
difficulty: medium
category: medium
topics: []
patterns: ["backtrack-permutation"]
estimated_time_minutes: 30
---
# Find and Replace Pattern

## Problem

Imagine you're building a pattern matching system for a code refactoring tool. You have an array of strings called `words` and a template `pattern`. Your task is to identify all strings in `words` that follow the same structural pattern as your template.

A word matches the pattern when there exists a perfect one-to-one character mapping (called a bijection in mathematics) that can transform the pattern into the word. Here's what this means:
- Each character in the pattern must map to exactly one character in the word
- No two different pattern characters can map to the same word character
- The mapping must be consistent throughout the entire string

Think of it like a cipher: if 'a' maps to 'm' and 'b' maps to 'e', then the pattern "abb" would transform to "mee". However, the pattern "abb" could never match "ccc" because that would require both 'a' and 'b' to map to the same letter 'c', which violates the one-to-one rule.

Return all matching words from the array in any order.

## Why This Matters

Pattern matching with bijective mappings is fundamental to many real-world applications. In cryptography, this technique helps identify substitution ciphers. In natural language processing, it's used for text pattern recognition and word similarity analysis. Code editors use this for intelligent find-and-replace operations that respect variable naming patterns. The concept appears in template matching systems, plagiarism detection tools, and DNA sequence analysis. Understanding string isomorphism (structural equivalence) is also crucial for problems in compiler design where you need to detect equivalent code patterns, or in data anonymization where you need to consistently replace sensitive information while preserving structure. This problem teaches you to work with bidirectional mappings and handle equivalence relations, skills that extend to graph isomorphism and structural pattern recognition.

## Examples

**Example 1:**
- Input: `words = ["abc","deq","mee","aqq","dkd","ccc"], pattern = "abb"`
- Output: `["mee","aqq"]`
- Explanation: "mee" works with mapping {a → m, b → e}. "aqq" works with mapping {a → a, b → q}. However, "ccc" fails because it would require both 'a' and 'b' to map to 'c', violating the one-to-one requirement.

**Example 2:**
- Input: `words = ["a","b","c"], pattern = "a"`
- Output: `["a","b","c"]`

## Constraints

- 1 <= pattern.length <= 20
- 1 <= words.length <= 50
- words[i].length == pattern.length
- pattern and words[i] are lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
The key is checking if a bijection (one-to-one mapping) exists between pattern and word characters. Two characters in the pattern should map to the same character in the word if and only if they're the same. This is an isomorphism check - you need to verify both directions of the mapping.
</details>

<details>
<summary>🎯 Main Approach</summary>
For each word, create two hash maps: pattern_to_word and word_to_pattern. Iterate through characters simultaneously. For each pair (p, w), check if p is already mapped to something different than w, or if w is already mapped to something different than p. If either fails, the word doesn't match. If you complete the iteration without conflicts, it's a match.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Alternative approach: normalize both pattern and word to the same canonical form (like "abb" becomes "011" where each new character gets the next sequential ID). Compare the normalized forms for equality. This avoids maintaining two hash maps and simplifies the code. Both approaches are O(n) per word where n is word length.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(w * n²) | O(1) | w words, n chars; check all mappings each time |
| Two Hash Maps | O(w * n) | O(n) | w words, n chars per word |
| Normalization | O(w * n) | O(n) | Simpler code, same complexity |

## Common Mistakes

1. **Only checking one direction of mapping**
   ```python
   # Wrong: Only mapping pattern to word
   mapping = {}
   for p, w in zip(pattern, word):
       if p in mapping and mapping[p] != w:
           return False
       mapping[p] = w

   # Correct: Check both directions (bijection)
   p_to_w, w_to_p = {}, {}
   for p, w in zip(pattern, word):
       if p in p_to_w and p_to_w[p] != w:
           return False
       if w in w_to_p and w_to_p[w] != p:
           return False
       p_to_w[p], w_to_p[w] = w, p
   ```

2. **Not handling repeated characters**
   ```python
   # Wrong: "ccc" should fail pattern "abb"
   # because 'a' and 'b' can't both map to 'c'
   mapping = {}
   for p, w in zip(pattern, word):
       mapping[p] = w

   # Correct: Check reverse mapping too
   if w in w_to_p and w_to_p[w] != p:
       return False
   ```

3. **Comparing lengths incorrectly**
   ```python
   # Wrong: Not provided in problem but good to check
   if len(word) != len(pattern):
       # Should be guaranteed by problem constraints

   # Correct: Problem states all words same length as pattern
   # But defensive check doesn't hurt
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Isomorphic Strings | Easy | Same concept, check if two strings are isomorphic |
| Word Pattern | Easy | Pattern of words instead of characters |
| Find Duplicate Subtrees | Medium | Apply pattern matching to tree structures |
| Group Anagrams | Medium | Different equivalence relation (sorted chars) |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Hash Map Patterns](../../strategies/patterns/hashmap-patterns.md)
