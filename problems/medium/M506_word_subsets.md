---
id: M506
old_id: A383
slug: word-subsets
title: Word Subsets
difficulty: medium
category: medium
topics: ["array"]
patterns: ["backtrack-combination"]
estimated_time_minutes: 30
---
# Word Subsets

## Problem

You're given two arrays of strings: `words1` and `words2`. Your task is to find all the "universal" words from `words1` - words that are powerful enough to contain every word from `words2` as a subset.

But what does it mean for word `b` to be a subset of word `a`? It means every letter in `b` appears in `a` with at least the same frequency.

For example:
- `"wrr"` is a subset of `"warrior"` because `"warrior"` contains w (1 time), r (2 times), matching or exceeding what's needed
- `"wrr"` is NOT a subset of `"world"` because `"world"` only has one 'r', but `"wrr"` needs two

A word from `words1` is considered **universal** if it contains every single word in `words2` as a subset.

Think of `words2` as a list of requirements, and you need to find all words in `words1` that satisfy ALL requirements simultaneously.

For instance, if `words2 = ["e", "oo"]`, a universal word must have:
- At least one 'e' (from the first requirement)
- At least two 'o's (from the second requirement)

So `"google"` would be universal (has 'e' and two 'o's), but `"apple"` would not (has 'e' but no 'o's).

Return all universal words from `words1` in any order.

## Why This Matters

This problem mirrors search and filtering systems used in document databases and e-commerce platforms. When users specify multiple search criteria (like "must contain these ingredients" in a recipe database, or "must have these features" in a product catalog), the system needs to efficiently find items matching all requirements. Similar frequency-counting techniques power spam filters that look for patterns across multiple keywords, autocomplete systems that suggest words containing specific character combinations, and plagiarism detectors that identify documents sharing common phrases. Learning to combine multiple frequency requirements into a single unified check is a fundamental optimization in text processing systems.

## Examples

**Example 1:**
- Input: `words1 = ["amazon","apple","facebook","google","algoprac"], words2 = ["e","o"]`
- Output: `["facebook","google","algoprac"]`

**Example 2:**
- Input: `words1 = ["amazon","apple","facebook","google","algoprac"], words2 = ["l","e"]`
- Output: `["apple","google","algoprac"]`

## Constraints

- 1 <= words1.length, words2.length <= 10⁴
- 1 <= words1[i].length, words2[i].length <= 10
- words1[i] and words2[i] consist only of lowercase English letters.
- All the strings of words1 are **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Instead of checking each word in words1 against every word in words2, create a "universal requirement" by taking the maximum frequency of each character across all words in words2. A word is universal if it meets this combined requirement.
</details>

<details>
<summary>🎯 Main Approach</summary>
First, build a frequency map representing the maximum count needed for each character across all words in words2. Then, for each word in words1, build its frequency map and check if it satisfies all requirements. Use Counter from collections for easy frequency counting.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Since words consist only of lowercase letters, you can use a fixed-size array of 26 integers instead of a dictionary for faster frequency counting. Access characters using ord(char) - ord('a') as the index.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n × m × l) | O(1) | n = len(words1), m = len(words2), l = avg word length |
| Optimal (Combined requirement) | O((n + m) × l) | O(1) | Process words2 once, then check words1 |

## Common Mistakes

1. **Checking words independently instead of combined requirement**
   ```python
   # Wrong: Check each word2 separately (too slow)
   for word1 in words1:
       is_universal = True
       for word2 in words2:
           if not is_subset(word2, word1):
               is_universal = False
               break
       if is_universal:
           result.append(word1)

   # Correct: Build combined requirement first
   max_freq = {}
   for word2 in words2:
       freq = Counter(word2)
       for char, count in freq.items():
           max_freq[char] = max(max_freq.get(char, 0), count)

   for word1 in words1:
       freq1 = Counter(word1)
       if all(freq1[char] >= count for char, count in max_freq.items()):
           result.append(word1)
   ```

2. **Incorrect subset checking logic**
   ```python
   # Wrong: Only checking if characters exist
   if all(char in word1 for char in word2):
       # This doesn't check frequency!

   # Correct: Check frequency counts
   freq1 = Counter(word1)
   freq2 = Counter(word2)
   if all(freq1[char] >= count for char, count in freq2.items()):
       # This checks both existence and frequency
   ```

3. **Not handling zero counts properly**
   ```python
   # Wrong: Assumes all characters are in max_freq
   for char in 'abcdefghijklmnopqrstuvwxyz':
       if freq1[char] < max_freq[char]:  # KeyError if char not in max_freq!

   # Correct: Use get with default or iterate max_freq
   if all(freq1.get(char, 0) >= count for char, count in max_freq.items()):
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Find Common Characters | Easy | Find characters that appear in all strings |
| Minimum Window Substring | Hard | Find shortest substring containing all characters |
| Group Anagrams | Medium | Group words by character frequency |
| Valid Anagram | Easy | Check if two words have same character frequencies |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Hash Table](../../prerequisites/hash-table.md)
