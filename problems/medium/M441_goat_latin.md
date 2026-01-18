---
id: M441
old_id: A291
slug: goat-latin
title: Goat Latin
difficulty: medium
category: medium
topics: ["string"]
patterns: []
estimated_time_minutes: 30
---
# Goat Latin

## Problem

Transform a sentence into "Goat Latin," a playful language game similar to Pig Latin. Given a string `sentence` containing space-separated words (each word has only alphabetic characters), apply three transformation rules to convert it:

**Rule 1 - Vowel vs Consonant Handling:**
If a word starts with a vowel (`a`, `e`, `i`, `o`, or `u` in either uppercase or lowercase), append `"ma"` directly to the end of the word. For example, `"apple"` becomes `"applema"`.

If a word starts with a consonant, move the first letter to the end of the word, then append `"ma"`. For instance, `"goat"` becomes `"oatgma"`.

**Rule 2 - Add Base Suffix:**
After applying Rule 1, append `"ma"` to every word (this is already included in Rule 1's examples above).

**Rule 3 - Position-Based Extension:**
Add a number of `'a'` characters equal to the word's position in the sentence (1-indexed). The first word gets one `'a'`, the second gets two `'a'` characters, the third gets three, and so on.

Combining all rules: the first word might transform like `"I"` → `"Ima"` → `"Imaa"` (vowel word at position 1), while the second word transforms like `"speak"` → `"peaksma"` → `"peaksmaaa"` (consonant word at position 2).

Return the fully transformed sentence with all words processed according to these rules and joined by spaces.

## Why This Matters

This problem strengthens your string manipulation skills through multi-step transformations that mirror real-world text processing tasks. You'll encounter similar patterns when building text formatters, internationalization systems, or data sanitization pipelines. The challenge lies in correctly tracking position indexes and handling case-insensitive vowel detection—common requirements in production code. This also reinforces the importance of efficient string building in languages where concatenation can be costly.

## Examples

**Example 1:**
- Input: `sentence = "I speak Goat Latin"`
- Output: `"Imaa peaksmaaa oatGmaaaa atinLmaaaaa"`

**Example 2:**
- Input: `sentence = "The quick brown fox jumped over the lazy dog"`
- Output: `"heTmaa uickqmaaa rownbmaaaa oxfmaaaaa umpedjmaaaaaa overmaaaaaaa hetmaaaaaaaa azylmaaaaaaaaa ogdmaaaaaaaaaa"`

## Constraints

- 1 <= sentence.length <= 150
- sentence consists of English letters and spaces.
- sentence has no leading or trailing spaces.
- All the words in sentence are separated by a single space.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a straightforward string manipulation problem with three independent transformations: vowel/consonant handling, adding "ma", and adding position-based 'a's. Process each word independently and track the word index.
</details>

<details>
<summary>🎯 Main Approach</summary>
Split the sentence into words. For each word with its index: (1) check if the first character (case-insensitive) is a vowel; (2) if consonant, move first char to end; (3) append "ma"; (4) append 'a' * (index + 1). Join transformed words with spaces.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use a set for O(1) vowel lookup: vowels = {'a', 'e', 'i', 'o', 'u', 'A', 'E', 'I', 'O', 'U'}. Build the result using a list and join at the end for better string concatenation performance in Python.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| String concatenation | O(n²) | O(n) | String concatenation in loop is inefficient |
| Optimal (List join) | O(n) | O(n) | Where n is total length of all characters |

## Common Mistakes

1. **Case sensitivity when checking vowels**
   ```python
   # Wrong: Only checking lowercase vowels
   if word[0] in 'aeiou':
       result = word + 'ma'

   # Correct: Check both cases
   if word[0].lower() in 'aeiou':
       result = word + 'ma'
   # Or use: if word[0] in 'aeiouAEIOU':
   ```

2. **Inefficient string building**
   ```python
   # Wrong: String concatenation in loop (O(n²) for position suffix)
   result = ""
   for i, word in enumerate(words):
       transformed = transform_word(word)
       transformed += 'a' * (i + 1)
       result += transformed + " "

   # Correct: Build list and join
   result = []
   for i, word in enumerate(words):
       transformed = transform_word(word)
       transformed += 'ma' + 'a' * (i + 1)
       result.append(transformed)
   return ' '.join(result)
   ```

3. **Off-by-one error in position counting**
   ```python
   # Wrong: Using 0-based indexing for 'a' count
   for i, word in enumerate(words):
       suffix = 'a' * i  # First word gets 0 'a's instead of 1

   # Correct: Use 1-based indexing
   for i, word in enumerate(words):
       suffix = 'a' * (i + 1)  # First word gets 1 'a'
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Pig Latin translation | Easy | Different vowel/consonant rules |
| Reverse words in sentence | Easy | Simpler transformation |
| Custom cipher with position | Medium | More complex character mapping |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [String Manipulation](../../strategies/fundamentals/string-processing.md)
