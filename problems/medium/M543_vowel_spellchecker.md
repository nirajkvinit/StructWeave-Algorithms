---
id: M543
old_id: A433
slug: vowel-spellchecker
title: Vowel Spellchecker
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Vowel Spellchecker

## Problem

You're building an intelligent spell-checking system similar to what you'd find in Google Docs or Microsoft Word. Given a dictionary of correctly spelled words (`wordlist`), your system needs to correct misspelled query words using a priority-based matching strategy.

Your spell checker handles two common types of typing errors:

**1. Case Errors:** When someone types "YellOw" but the dictionary has "yellow", the capitalization differs but the letters are the same. Your system should recognize this and return the dictionary's version.

**2. Vowel Confusion Errors:** When someone types "yollow" instead of "yellow" (swapping 'e' for 'o'), the consonants are in the right places but vowels are wrong. Your system should be forgiving about vowel substitutions since they're easy to mix up when typing quickly.

The correction process follows this priority order:

1. **Exact match:** If the query exactly matches a dictionary word (case-sensitive), return it unchanged
2. **Case-insensitive match:** If lowercasing both the query and a dictionary word produces a match, return the first matching dictionary word
3. **Vowel-pattern match:** If the query matches a word when all vowels are treated as interchangeable (case-insensitive), return the first such match
4. **No match:** If no matches are found at any level, return an empty string

Process multiple `queries` and return a list `answer` where `answer[i]` contains the corrected form of `queries[i]`.

## Why This Matters

Spell-checking systems are ubiquitous in modern software—from search engines that correct "acommodate" to "accommodate," to code editors that suggest variable name corrections, to autocorrect on smartphones. This problem teaches the fundamentals of fuzzy string matching, which extends to search engine query processing (handling typos in Google searches), DNA sequence alignment (where certain base pairs can substitute for others), and plagiarism detection systems. Understanding tiered matching strategies is crucial for building user-friendly applications that gracefully handle imperfect input. The hash map optimization techniques you'll learn here directly apply to building fast lookup systems in databases, caching layers, and recommendation engines.

## Examples

**Example 1:**
- Input: `wordlist = ["KiTe","kite","hare","Hare"], queries = ["kite","Kite","KiTe","Hare","HARE","Hear","hear","keti","keet","keto"]`
- Output: `["kite","KiTe","KiTe","Hare","hare","","","KiTe","","KiTe"]`

**Example 2:**
- Input: `wordlist = ["yellow"], queries = ["YellOw"]`
- Output: `["yellow"]`

## Constraints

- 1 <= wordlist.length, queries.length <= 5000
- 1 <= wordlist[i].length, queries[i].length <= 7
- wordlist[i] and queries[i] consist only of only English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Build three different hash maps for the three matching levels: (1) exact match, (2) case-insensitive match, (3) vowel-pattern match. Process queries by checking each level in priority order. The vowel pattern is created by converting all vowels to a wildcard character and lowercasing.
</details>

<details>
<summary>🎯 Main Approach</summary>
Create three dictionaries: exact_match (word as-is), lowercase_match (word.lower()), and vowel_pattern_match (word with vowels replaced by '*'). For each query, first check exact_match. If not found, check lowercase_match. If still not found, check vowel_pattern_match. Return the corresponding original word from the dictionary, or empty string if no matches.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
When building the dictionaries, only store the first occurrence for case-insensitive and vowel-pattern matches (use 'if key not in dict' before insertion). This ensures priority to earlier words in the wordlist. Use a helper function to create the vowel pattern by replacing all vowels with a consistent wildcard.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Naive String Comparison | O(w × q × L) | O(1) | w=wordlist size, q=queries, L=word length |
| Three Hash Maps | O((w + q) × L) | O(w × L) | Build 3 maps, then O(1) lookup per query |
| Optimal | O((w + q) × L) | O(w × L) | Preprocessing + constant-time lookups |

## Common Mistakes

1. **Not preserving original capitalization in results**
   ```python
   # Wrong: Returning modified version
   result = query.lower()

   # Correct: Return original word from dictionary
   pattern = create_vowel_pattern(query.lower())
   if pattern in vowel_map:
       result = vowel_map[pattern]  # Original form
   ```

2. **Incorrect vowel pattern creation**
   ```python
   # Wrong: Only replacing specific vowels
   pattern = word.replace('a', '*').replace('e', '*')
   # Missing i, o, u

   # Correct: Replace all vowels
   vowels = set('aeiouAEIOU')
   pattern = ''.join('*' if c.lower() in vowels else c.lower()
                     for c in word)
   ```

3. **Not following priority order**
   ```python
   # Wrong: Checking all dictionaries and picking any match
   if query in exact or query.lower() in lower_map:
       return some_match

   # Correct: Check in strict priority order
   if query in exact_map:
       return exact_map[query]
   if query.lower() in lower_map:
       return lower_map[query.lower()]
   pattern = create_pattern(query.lower())
   if pattern in vowel_map:
       return vowel_map[pattern]
   return ""
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Implement Magic Dictionary | Medium | Single character difference matching |
| Word Search II | Hard | Trie-based word matching in grid |
| Longest Word in Dictionary | Medium | Prefix-based word building |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Hash Table](../../prerequisites/hash-tables.md)
