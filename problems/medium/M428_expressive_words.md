---
id: M428
old_id: A276
slug: expressive-words
title: Expressive Words
difficulty: medium
category: medium
topics: ["array", "string"]
patterns: []
estimated_time_minutes: 30
---
# Expressive Words

## Problem

Sometimes when emphasizing words, people extend them by repeating certain letters. For example, "hello" might become "heeellooo" or "hi" might become "hiiiii". This problem formalizes what makes a valid extension.

Let's start with the concept of **character groups**. In any string, consecutive identical characters form a group. For instance, in "heeellooo", the groups are: 'h' (length 1), 'eee' (length 3), 'll' (length 2), and 'ooo' (length 3). Similarly, "hello" has groups: 'h' (1), 'e' (1), 'll' (2), 'o' (1).

A word can be **extended** into a target string through a series of character group expansions. To extend a group, you can increase its length to at least 3 characters. For example, the 'e' group in "hello" (length 1) can extend to "eee" (length 3 or more), and the 'o' group can extend from 1 to "ooo" (3 or more). However, there's a key rule: you can only extend groups to 3 or more characters. You cannot extend 'e' from 1 to 2 characters, as that wouldn't be "expressive" enough.

Given a target string `s` and an array of candidate `words`, determine which words are **stretchy** relative to `s`. A word is stretchy if you can transform it into `s` by extending zero or more of its character groups (where extending means taking a group and making it at least 3 characters long). For the extension to be valid, the word must have the same sequence of characters as the target, and each group in the target must either match the corresponding group in the word exactly, or be an extension (length >= 3) of that group.

Return the count of stretchy words in the input array.

## Why This Matters

This problem exercises the two-pointer technique and character grouping, both fundamental patterns in string processing. The concept of run-length encoding (grouping consecutive characters) appears in data compression algorithms, pattern matching in bioinformatics (DNA sequence analysis), and text analysis for natural language processing. The validation logic of comparing grouped representations is similar to edit distance calculations and string similarity metrics used in spell checkers, plagiarism detection, and fuzzy matching systems. Understanding how to efficiently compare structural patterns in strings is valuable for parsing, validation, and text transformation tasks.

## Examples

**Example 1:**
- Input: `s = "heeellooo", words = ["hello", "hi", "helo"]`
- Output: `1`
- Explanation: The word "hello" can be extended by expanding 'e' and 'o' groups to match "heeellooo".
The word "helo" cannot match because it lacks the "ll" group that appears in the target.
The word "hi" has completely different characters.

**Example 2:**
- Input: `s = "zzzzzyyyyy", words = ["zzyy","zy","zyy"]`
- Output: `3`

## Constraints

- 1 <= s.length, words.length <= 100
- 1 <= words[i].length <= 100
- s and words[i] consist of lowercase letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
Group consecutive identical characters in both the target string and each word. A word is stretchy if every character group matches between the word and target, with specific size constraints: groups in the target must be either the same size as in the word, or have 3+ characters if they're larger.
</details>

<details>
<summary>Main Approach</summary>
Use two-pointer technique to traverse both strings simultaneously. For each character, count the group length in both strings. A group is valid if: (1) characters match, (2) target group size >= word group size, and (3) if target group is larger, it must have at least 3 characters.
</details>

<details>
<summary>Optimization Tip</summary>
Early termination can save time: if characters don't match or if the target group is smaller than the word group, immediately return false. Also handle edge cases where group sizes are 1 or 2 carefully.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Two Pointer Grouping | O(n * m) | O(1) | n = words.length, m = average word length |
| Optimal | O(n * m) | O(1) | Process each word once against target |

## Common Mistakes

1. **Incorrect group extension validation**
   ```python
   # Wrong: Allowing groups of size 2 in target when word has size 1
   if target_count >= word_count:
       return True

   # Correct: Target group must be either same size or 3+
   if target_count < word_count:
       return False
   if target_count != word_count and target_count < 3:
       return False
   ```

2. **Not checking character match first**
   ```python
   # Wrong: Comparing counts before verifying characters match
   if len(s_group) >= len(word_group):
       continue

   # Correct: Ensure characters match before comparing counts
   if s[i] != word[j]:
       return False
   # Then compare group sizes
   ```

3. **Forgetting to handle end-of-string boundaries**
   ```python
   # Wrong: Not checking if both strings end together
   while i < len(s):
       # process groups
       i += count

   # Correct: Both pointers should reach end simultaneously
   if i != len(s) or j != len(word):
       return False
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Compress string to shortest form | Medium | Remove consecutive duplicates maintaining minimum |
| Expand to match pattern | Medium | Generate valid expansions instead of validation |
| Group Anagrams | Medium | Character grouping with different validation rules |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Two Pointers](../../strategies/patterns/two-pointers.md)
