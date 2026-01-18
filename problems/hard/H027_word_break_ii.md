---
id: H027
old_id: F140
slug: word-break-ii
title: Word Break II
difficulty: hard
category: hard
topics: ["string"]
patterns: []
estimated_time_minutes: 45
---
# Word Break II

## Problem

Return all possible sentences formed by segmenting a string using dictionary words.

## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Examples

**Example 1:**
- Input: `s = "catsanddog", wordDict = ["cat","cats","and","sand","dog"]`
- Output: `["cats and dog","cat sand dog"]`

**Example 2:**
- Input: `s = "pineapplepenapple", wordDict = ["apple","pen","applepen","pine","pineapple"]`
- Output: `["pine apple pen apple","pineapple pen apple","pine applepen apple"]`
- Explanation: Note that you are allowed to reuse a dictionary word.

**Example 3:**
- Input: `s = "catsandog", wordDict = ["cats","dog","sand","and","cat"]`
- Output: `[]`

## Constraints

- 1 <= s.length <= 20
- 1 <= wordDict.length <= 1000
- 1 <= wordDict[i].length <= 10
- s and wordDict[i] consist of only lowercase English letters.
- All the strings of wordDict are **unique**.
- Input is generated in a way that the length of the answer doesn't exceed 10⁵.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Use backtracking with memoization. At each position, try all dictionary words that match the current prefix, recursively solve for the remaining string, and combine results. Memoize by storing results for each starting position to avoid recomputing the same subproblems.
</details>

<details>
<summary>🎯 Main Approach</summary>
Convert wordDict to a set for O(1) lookup. Use DFS/backtracking starting from index 0. At each position, try all possible word lengths, check if the substring matches a dictionary word, and recursively get all valid sentences for the remaining string. Combine current word with all returned sentences. Use memoization dictionary keyed by starting index.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Before doing the expensive backtracking, first check if the string can be segmented at all using simple DP (Word Break I). This early exit prevents wasting time on impossible cases. Also, memoize results based on the remaining substring or index position.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Backtracking (no memo) | O(2^n) | O(n) | Exponential without memoization |
| Backtracking + Memo | O(n² * 2^n) | O(n * 2^n) | Still exponential but pruned significantly |

## Common Mistakes

1. **Not using memoization**
   ```python
   # Wrong: Recomputes same substrings repeatedly
   def wordBreak(s, wordDict):
       if not s:
           return [""]
       result = []
       for word in wordDict:
           if s.startswith(word):
               for rest in wordBreak(s[len(word):], wordDict):
                   result.append((word + " " + rest).strip())
       return result

   # Correct: Memoize by position or substring
   def wordBreak(s, wordDict, memo=None):
       if memo is None:
           memo = {}
       if s in memo:
           return memo[s]
       if not s:
           return [""]
       result = []
       for word in wordDict:
           if s.startswith(word):
               for rest in wordBreak(s[len(word):], wordDict, memo):
                   result.append((word + " " + rest).strip())
       memo[s] = result
       return result
   ```

2. **Inefficient word matching**
   ```python
   # Wrong: Checking every word even if it can't match
   for word in wordDict:
       if s.startswith(word):

   # Better: Check substring first if using set
   word_set = set(wordDict)
   for end in range(1, len(s) + 1):
       if s[0:end] in word_set:
   ```

3. **String concatenation issues**
   ```python
   # Wrong: Extra spaces at the beginning
   result.append(word + " " + rest)  # When rest is empty

   # Correct: Handle empty case
   if rest:
       result.append(word + " " + rest)
   else:
       result.append(word)
   # Or use strip()
   result.append((word + " " + rest).strip())
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Word Break | Medium | Only check if segmentation exists, not all ways |
| Concatenated Words | Hard | Words can be formed from other words in list |
| Word Break III | Medium | Count number of valid segmentations |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Backtracking with Memoization](../../strategies/patterns/backtracking.md)
