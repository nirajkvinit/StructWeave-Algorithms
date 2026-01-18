---
id: M413
old_id: A259
slug: number-of-matching-subsequences
title: Number of Matching Subsequences
difficulty: medium
category: medium
topics: ["array", "string"]
patterns: []
estimated_time_minutes: 30
---
# Number of Matching Subsequences

## Problem

Given a string `s` and an array of strings `words`, count how many strings in `words` are subsequences of `s`.

A subsequence is formed by deleting zero or more characters from a string while maintaining the relative order of remaining characters. For example, "ace" is a subsequence of "abcde" (delete 'b' and 'd'), but "aec" is not (the order changes).

The naive approach of checking each word independently against `s` would scan through `s` multiple times, which becomes inefficient when `words` contains many strings. For instance, if `s = "abcde"` and `words = ["a", "bb", "acd", "ace"]`, you need to determine that three words ("a", "acd", "ace") are valid subsequences while "bb" is not (since `s` contains only one 'b').

The key challenge is avoiding repeated scans of `s`. When you have thousands of words to check, scanning `s` independently for each word wastes computation since many words might be waiting for the same character at the same position.

## Why This Matters

Subsequence matching is fundamental to text search, DNA sequence analysis, version control systems (finding common patterns across file versions), and log analysis. This problem teaches an important optimization technique: instead of processing the input string multiple times for different queries, you can process it once while simultaneously advancing multiple search patterns. This "single-pass multi-match" pattern appears in stream processing, network packet filtering, and real-time monitoring systems where you need to match many patterns against a continuous data stream efficiently.

## Examples

**Example 1:**
- Input: `s = "abcde", words = ["a","bb","acd","ace"]`
- Output: `3`
- Explanation: There are three strings in words that are a subsequence of s: "a", "acd", "ace".

**Example 2:**
- Input: `s = "dsahjpjauf", words = ["ahjpjau","ja","ahbwzgqnuk","tnmlanowax"]`
- Output: `2`

## Constraints

- 1 <= s.length <= 5 * 10⁴
- 1 <= words.length <= 5000
- 1 <= words[i].length <= 50
- s and words[i] consist of only lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Instead of checking each word independently against s (which would scan s many times), process s once and advance all words simultaneously. Group words by their current character being matched. As you scan through s, move words to the next character group when their current character is found.
</details>

<details>
<summary>🎯 Main Approach</summary>
Create a dictionary mapping each character to a list of iterators (one per word waiting for that character). Scan through s character by character. For each character in s, retrieve all word-iterators waiting for that character, advance them to their next character, and place them in the appropriate bucket. When an iterator completes (no more characters), increment the result count.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Preprocess s into a position map: for each character, store all its indices in s. Then for each word, use binary search to find the next occurrence of each character after the current position. This avoids scanning s repeatedly and gives O(w * L * log n) where w = number of words, L = average word length, n = length of s.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Naive | O(w * n) | O(1) | Check each word against s independently |
| Iterator Grouping | O(n + w * L) | O(w * L) | Process s once, advance all words; L = avg word length |
| Binary Search | O(n + w * L * log n) | O(n) | Preprocess s positions, binary search for each character |
| Optimal | O(n + w * L) | O(w * L) | Iterator-based simultaneous matching |

## Common Mistakes

1. **Checking each word independently**
   ```python
   # Wrong: Scanning s for each word separately
   def num_matching(s, words):
       count = 0
       for word in words:
           if is_subsequence(word, s):  # O(n) per word
               count += 1
       return count

   # Correct: Process s once, advance all words simultaneously
   from collections import defaultdict
   def num_matching(s, words):
       waiting = defaultdict(list)
       for word in words:
           it = iter(word)
           waiting[next(it)].append(it)

       count = 0
       for ch in s:
           for it in waiting.pop(ch, []):
               nxt = next(it, None)
               if nxt:
                   waiting[nxt].append(it)
               else:
                   count += 1
       return count
   ```

2. **Not handling duplicate words efficiently**
   ```python
   # Wrong: Processing duplicate words separately
   for word in words:
       # Each duplicate checked independently

   # Correct: Group duplicate words or use Counter
   from collections import Counter
   word_count = Counter(words)
   unique_words = list(word_count.keys())
   # Process unique words, multiply result by count
   ```

3. **Using string slicing which is inefficient**
   ```python
   # Wrong: Creating new strings with slicing
   def is_subsequence(word, s):
       for ch in word:
           idx = s.find(ch)
           if idx == -1:
               return False
           s = s[idx+1:]  # Creates new string each time

   # Correct: Use pointers/iterators
   def is_subsequence(word, s):
       it = iter(s)
       return all(ch in it for ch in word)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Is Subsequence | Easy | Check single word instead of array |
| Longest Word in Dictionary | Medium | Find longest word that is subsequence |
| Shortest Way to Form String | Medium | Count minimum source concatenations needed |
| Number of Subsequences That Satisfy Sum Condition | Medium | Different matching criteria (sum-based) |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Two Pointers](../../strategies/patterns/two-pointers.md)
