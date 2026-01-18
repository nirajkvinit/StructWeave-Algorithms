---
id: M238
old_id: A025
slug: word-abbreviation
title: Word Abbreviation
difficulty: medium
category: medium
topics: ["array", "string"]
patterns: []
estimated_time_minutes: 30
frequency: low
related_problems:
  - id: E001
    title: Two Sum
    difficulty: easy
  - id: M001
    title: Add Two Numbers
    difficulty: medium
prerequisites:
  - String manipulation
  - Prefix generation
  - Hash tables for grouping
---
# Word Abbreviation

## Problem

Given an array of distinct strings, create the shortest unique abbreviation for each word. An abbreviation follows the pattern: `first_letter + number_of_middle_chars + last_letter`. For example, `"internationalization"` becomes `"i18n"` (i + 18 middle characters + n).

The challenge arises when multiple words generate the same abbreviation. For instance, `"abcdef"` and `"abndef"` both abbreviate to `"a4f"`. To resolve conflicts, incrementally expand the prefix until all abbreviations become unique: `"a4f","a4f"` becomes `"ab3f","ab3f"`, then `"abc2f","abn2f"` where they finally differ.

Key rules to follow:
1. Only abbreviate if it saves space. For `"me"` (2 chars), the abbreviation would be `"m0e"` (3 chars), so keep the original word.
2. The abbreviation must be shorter than the original. Generally, words need at least 4 characters for abbreviation to help.
3. When conflicts occur, expand the prefix for ALL conflicting words simultaneously until they diverge.
4. Once a word has a unique abbreviation, don't expand it further.

The algorithm must handle grouping words by their current abbreviation, detecting conflicts within groups, and incrementally expanding prefixes for conflicting words. A hash map helps track which words share abbreviations at each iteration. The process continues until no conflicts remain.

Consider this example with `["like","god","internal","me","internet","interval","intension"]`: words like `"internal"` and `"internet"` will conflict at multiple prefix lengths before finally diverging at `"internal"` vs `"internet"` (abbreviation not helpful, keep full words).

## Why This Matters

This problem teaches conflict resolution in compressed data structures, a pattern appearing in URL shorteners (handling hash collisions), file deduplication systems (resolving content-based naming conflicts), and database schema migrations (generating unique column aliases). The incremental prefix expansion strategy is a form of greedy algorithm where you make minimal adjustments until constraints are satisfied. This technique extends to namespace collision resolution in compilers, symbol table management, and code generation. Understanding when abbreviation saves space versus when to use full strings is also practical for designing compact data formats and network protocols. The hash-based grouping approach demonstrates efficient conflict detection, avoiding O(n²) pairwise comparisons by organizing data for O(n) processing.

## Examples

**Example 1:**
- Input: `words = ["like","god","internal","me","internet","interval","intension","face","intrusion"]`
- Output: `["l2e","god","internal","me","i6t","interval","inte4n","f2e","intr4n"]`

**Example 2:**
- Input: `words = ["aa","aaa"]`
- Output: `["aa","aaa"]`

## Constraints

- 1 <= words.length <= 400
- 2 <= words[i].length <= 400
- words[i] consists of lowercase English letters.
- All the strings of words are **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Understanding the abbreviation rule</summary>

Start by generating the initial abbreviation for each word using the pattern: first_char + middle_length + last_char. Only abbreviate if the result is shorter than the original word (saves at least 2 characters).

Key insight: An abbreviation like "a4f" has 3 characters, so the original word must be at least 5 characters long for abbreviation to be worthwhile.

</details>

<details>
<summary>Hint 2: Handling collisions with grouping</summary>

Group all words that share the same abbreviation. For each collision group, incrementally expand the prefix length for all members until their abbreviations become unique.

Example process:
- Group by abbreviation: {"a4f": ["abcdef", "abndef"]}
- Expand prefix from 1 to 2: {"ab3f": ["abcdef", "abndef"]}
- Expand prefix from 2 to 3: {"abc2f": ["abcdef"], "abn2f": ["abndef"]} - Now unique!

</details>

<details>
<summary>Hint 3: Optimal implementation strategy</summary>

Use a hash map to track abbreviation groups. For each word, maintain a "prefix length" counter (starting at 1). When collisions occur, increment the prefix length for all conflicting words and regenerate their abbreviations.

Remember to check if the new abbreviation is still shorter than the word itself; if not, use the complete word instead.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Greedy with grouping | O(n * m^2) | O(n * m) | n = number of words, m = average word length; worst case requires expanding prefixes character by character |
| Trie-based resolution | O(n * m) | O(n * m) | Build trie to identify divergence points; more efficient for large inputs |

## Common Mistakes

1. Forgetting the length check

```python
# Wrong: Always abbreviate
def abbreviate(word, prefix_len):
    abbr = word[:prefix_len] + str(len(word) - prefix_len - 1) + word[-1]
    return abbr  # May be longer than original!

# Correct: Check if abbreviation is beneficial
def abbreviate(word, prefix_len):
    if len(word) - prefix_len <= 2:  # No savings
        return word
    abbr = word[:prefix_len] + str(len(word) - prefix_len - 1) + word[-1]
    return abbr if len(abbr) < len(word) else word
```

2. Not handling all collisions in a group

```python
# Wrong: Only comparing pairs
for i in range(len(words)):
    for j in range(i+1, len(words)):
        if abbr[i] == abbr[j]:
            # Only handles pairwise conflicts

# Correct: Group all conflicts together
from collections import defaultdict
groups = defaultdict(list)
for i, word in enumerate(words):
    groups[abbr[i]].append(i)
# Process entire groups at once
```

3. Inefficient collision resolution

```python
# Wrong: Regenerating all abbreviations in each iteration
while has_collisions():
    for word in words:
        prefix_len[word] += 1
        regenerate_all()  # O(n) every time

# Correct: Only update conflicting words
for group in collision_groups:
    for idx in group:
        prefix_len[idx] += 1
        abbr[idx] = abbreviate(words[idx], prefix_len[idx])
```

## Variations

| Variation | Difference | Strategy |
|-----------|-----------|----------|
| Fixed prefix length | All abbreviations must use prefix of length k | Simpler - no conflict resolution needed |
| Minimize total length | Optimize sum of all abbreviation lengths | Greedy: expand shortest possible prefix for each word |
| Case-insensitive | Treat 'A' and 'a' as same | Normalize to lowercase before grouping |
| Unicode support | Handle multi-byte characters | Use character indexing, not byte indexing |

## Practice Checklist

- [ ] Solve with basic grouping approach (30 min)
- [ ] Optimize collision detection (15 min)
- [ ] Handle edge cases (short words, all same prefix)
- [ ] Review after 1 day - solve from scratch
- [ ] Review after 1 week - optimize for large inputs
- [ ] Review after 1 month - implement trie-based solution

**Strategy**: Greedy algorithm with hash-based conflict resolution
