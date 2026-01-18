---
id: H075
old_id: I271
slug: concatenated-words
title: Concatenated Words
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Concatenated Words

## Problem

You have an array of distinct strings called `words`. Your task is to identify and return all strings that can be formed by joining together two or more other words from the same array.

A word qualifies as a **concatenated word** when it can be completely constructed by combining at least two words from the given array. The component words don't need to be different from each other.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `words = ["cat","cats","catsdogcats","dog","dogcatsdog","hippopotamuses","rat","ratcatdogcat"]`
- Output: `["catsdogcats","dogcatsdog","ratcatdogcat"]`
- Explanation: "catsdogcats" is formed from "cats" + "dog" + "cats";
"dogcatsdog" is formed from "dog" + "cats" + "dog";
"ratcatdogcat" is formed from "rat" + "cat" + "dog" + "cat".

**Example 2:**
- Input: `words = ["cat","dog","catdog"]`
- Output: `["catdog"]`

## Constraints

- 1 <= words.length <= 10⁴
- 1 <= words[i].length <= 30
- words[i] consists of only lowercase English letters.
- All the strings of words are **unique**.
- 1 <= sum(words[i].length) <= 10⁵

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

This is essentially a "Word Break" problem applied to each word. For each word, check if it can be formed by concatenating other words from the dictionary. The key optimization: process words by length (shortest first) so shorter words are available when checking longer ones.

Important: a word must be formed by at least TWO other words, so don't allow a word to be formed from itself alone.

</details>

<details>
<summary>🎯 Main Approach</summary>

Use dynamic programming with a word set:
1. Sort words by length
2. Create a set for fast lookup
3. For each word:
   - Use DP to check if it can be formed from smaller words already in the set
   - dp[i] = true if word[0:i] can be formed from dictionary
   - For each position i, try all possible last words ending at i
   - If valid (formed from 2+ words), add to result
   - Add current word to set for future lookups
4. Return all valid concatenated words

</details>

<details>
<summary>⚡ Optimization Tip</summary>

Use a Trie instead of a set for prefix matching - this allows you to efficiently check all possible word boundaries. Also, when checking if word[0:i] can be formed, you can prune early if the prefix itself isn't in the dictionary (unless it can be further broken down).

Another optimization: skip words that are longer than the total length of all shorter words combined.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n × 2^m × m) | O(n × m) | For each word, try all partitions |
| DP per Word | O(n × m² × m) | O(n × m) | n words, m² substrings, m for comparison |
| Optimal (with Trie) | O(n × m² + total_chars) | O(total_chars) | Trie reduces lookup time |

## Common Mistakes

1. **Allowing word to form itself**
   ```python
   # Wrong: Word can be counted as forming itself
   def can_form(word, word_set):
       dp = [False] * (len(word) + 1)
       dp[0] = True
       for i in range(1, len(word) + 1):
           for j in range(i):
               if dp[j] and word[j:i] in word_set:  # Includes word itself
                   dp[i] = True
       return dp[len(word)]

   # Correct: Exclude the word itself from dictionary during check
   def can_form(word, word_set):
       # Temporarily remove word from set
       word_set.discard(word)
       dp = [False] * (len(word) + 1)
       dp[0] = True
       for i in range(1, len(word) + 1):
           for j in range(i):
               if dp[j] and word[j:i] in word_set:
                   dp[i] = True
       word_set.add(word)  # Add back
       return dp[len(word)]
   ```

2. **Not checking for at least 2 components**
   ```python
   # Wrong: Accepting single-word "concatenation"
   def can_form(word, word_set):
       return word in word_set  # Not concatenated

   # Correct: Ensure at least 2 words used
   def can_form(word, word_set):
       dp = [0] * (len(word) + 1)  # Track count of words
       for i in range(1, len(word) + 1):
           for j in range(i):
               if word[j:i] in word_set:
                   if j == 0:
                       dp[i] = max(dp[i], 1)
                   elif dp[j] > 0:
                       dp[i] = max(dp[i], dp[j] + 1)
       return dp[len(word)] >= 2
   ```

3. **Inefficient order of processing**
   ```python
   # Wrong: Processing words in random order
   for word in words:
       if can_form(word, word_set):
           result.append(word)
   # Longer words can't use other long words processed later

   # Correct: Sort by length first
   words.sort(key=len)
   word_set = set()
   for word in words:
       if can_form(word, word_set):
           result.append(word)
       word_set.add(word)  # Make available for longer words
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Word Break | Medium | Check if single string can be segmented |
| Word Break II | Hard | Return all possible segmentations |
| Longest Word in Dictionary | Medium | Find longest word built one character at a time |
| Extra Characters in String | Medium | Minimize unmatched characters |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (self-concatenation, minimum 2 words)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming - String](../../strategies/patterns/dynamic-programming.md)
