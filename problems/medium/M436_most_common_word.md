---
id: M436
old_id: A286
slug: most-common-word
title: Most Common Word
difficulty: medium
category: medium
topics: ["array", "string"]
patterns: []
estimated_time_minutes: 30
---
# Most Common Word

## Problem

Given a paragraph of text and a list of banned words, find which non-banned word appears most frequently in the paragraph.

The paragraph contains regular English text with letters, spaces, and common punctuation marks like `!?',;.`. Your task is to extract all the words, count their frequencies, exclude any that appear in the `banned` list, and return the most common one. Word comparisons are case-insensitive, so "Ball", "ball", and "BALL" are all the same word, and your answer must be returned in lowercase.

The problem guarantees there will be at least one non-banned word and exactly one word with the highest frequency (no ties). This means you don't need to handle edge cases like multiple words having the same maximum count.

A key challenge is handling punctuation correctly. Words can have punctuation attached to them like `"ball,"` or `"hit."`, and these need to be treated as the base word without the punctuation. Additionally, words are separated by spaces and punctuation, so `"a.b"` would be parsed as separate words "a" and "b".

## Why This Matters

Text analysis and word frequency counting form the foundation of natural language processing, search engines, and content analysis systems. Applications include spam detection (finding common suspicious words), sentiment analysis (identifying frequently used positive or negative terms), keyword extraction for SEO, and building word clouds for data visualization. This problem teaches you essential text processing techniques: normalization (converting to lowercase), tokenization (splitting text into words), filtering (removing unwanted items), and aggregation (counting frequencies). These operations appear in virtually every system that processes user-generated text, from social media analytics to document search engines.

## Examples

**Example 1:**
- Input: `paragraph = "Bob hit a ball, the hit BALL flew far after it was hit.", banned = ["hit"]`
- Output: `"ball"`
- Explanation: While "hit" appears 3 times, it's excluded due to being banned.
"ball" appears twice, which is more than any other non-banned word in the text.
Important considerations: case is ignored when matching words,
punctuation marks are disregarded (even when attached to words like "ball,"),
and despite "hit" having the highest overall count, it cannot be the answer due to being banned.

**Example 2:**
- Input: `paragraph = "a.", banned = []`
- Output: `"a"`

## Constraints

- 1 <= paragraph.length <= 1000
- paragraph consists of English letters, space ' ', or one of the symbols: "!?',;.".
- 0 <= banned.length <= 100
- 1 <= banned[i].length <= 10
- banned[i] consists of only lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Parse the paragraph to extract words, normalizing to lowercase and removing punctuation. Use a hash map to count word frequencies, excluding banned words. Find the word with maximum frequency among non-banned words.
</details>

<details>
<summary>🎯 Main Approach</summary>
Convert paragraph to lowercase, replace punctuation with spaces, then split into words. Create a set from banned list for O(1) lookup. Use a counter/hash map to track frequencies of non-banned words. Iterate through the counter to find the word with highest frequency.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use regular expressions to extract words in one step: `re.findall(r'\w+', paragraph.lower())`. Convert banned to a set before processing. Track max frequency while building the counter to avoid a second pass.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Hash Map with Parsing | O(n + m) | O(n + m) | n = paragraph length, m = banned length |
| Optimal | O(n + m) | O(n + m) | Single pass with regex parsing |

## Common Mistakes

1. **Not handling punctuation correctly**
   ```python
   # Wrong: Split doesn't remove punctuation
   words = paragraph.lower().split()
   # "ball," stays as "ball," instead of "ball"

   # Correct: Remove punctuation or use regex
   import re
   words = re.findall(r'\w+', paragraph.lower())
   # Or: replace punctuation then split
   for p in "!?',;.":
       paragraph = paragraph.replace(p, ' ')
   words = paragraph.lower().split()
   ```

2. **Case sensitivity errors**
   ```python
   # Wrong: Not normalizing case
   if word not in banned:  # "Hit" != "hit"
       count[word] += 1

   # Correct: Convert everything to lowercase
   words = paragraph.lower().split()
   banned_set = set(w.lower() for w in banned)
   ```

3. **Not using a set for banned words**
   ```python
   # Wrong: O(m) lookup for each word
   for word in words:
       if word not in banned:  # O(m) list lookup
           count[word] += 1

   # Correct: O(1) set lookup
   banned_set = set(banned)
   for word in words:
       if word not in banned_set:  # O(1)
           count[word] += 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Top K Frequent Words | Medium | Find K most frequent instead of just one |
| Word Pattern | Easy | Pattern matching instead of frequency |
| Group Anagrams | Medium | Grouping by character composition |
| Valid Word Abbreviation | Easy | String validation with abbreviations |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Hash Tables](../../strategies/data-structures/hash-tables.md)
