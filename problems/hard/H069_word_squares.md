---
id: H069
old_id: I224
slug: word-squares
title: Word Squares
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Word Squares

## Problem

You are given an array of distinct strings called `words`. Your objective is to find all possible ***<a href="https://en.wikipedia.org/wiki/Word_square" target="_blank">word squares</a>*** that can be constructed using words from this array. Words may be reused **multiple times** in a single square. The results can be returned in **any order**.

A valid **word square** is created when the characters at position `k` in each row match the characters at position `k` in the corresponding column, for all values of `k` from `0` up to the maximum of the number of rows and columns.

	- As an illustration, the sequence `["ball","area","lead","lady"]` creates a word square since reading horizontally or vertically at each position yields the same characters.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `words = ["area","lead","wall","lady","ball"]`
- Output: `[["ball","area","lead","lady"],["wall","area","lead","lady"]]`
- Explanation: Two valid word squares can be formed. The sequence in which these squares appear in the output is not important, though the word order within each square is significant.

**Example 2:**
- Input: `words = ["abat","baba","atan","atal"]`
- Output: `[["baba","abat","baba","atal"],["baba","abat","baba","atan"]]`
- Explanation: Two valid word squares exist. The arrangement of these squares in the result doesn't matter, but the word sequence within each square must be preserved.

## Constraints

- 1 <= words.length <= 1000
- 1 <= words[i].length <= 4
- All words[i] have the same length.
- words[i] consists of only lowercase English letters.
- All words[i] are **unique**.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Use backtracking to build word squares row by row. The key constraint is: if you've placed k words, the (k+1)th word must start with a prefix formed by the k-th column. Use a Trie (prefix tree) to quickly find all words with a given prefix, enabling efficient backtracking with pruning.
</details>

<details>
<summary>🎯 Main Approach</summary>
Build a Trie from all words, storing at each node the list of words with that prefix. Use backtracking: for each row position, determine the required prefix by reading down the current column, then query the Trie for all words with that prefix. Try each candidate word and recurse. When the square is complete (n words placed), add it to results.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
The prefix constraint becomes more restrictive as you place more words. After placing row i, row i+1 must match prefixes for ALL previous columns simultaneously. Pre-build a Trie that maps prefixes to word lists for O(1) candidate retrieval. This reduces the search space dramatically compared to checking all words each time.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (try all perms) | O(n! * n²) | O(n²) | n = word length, factorial permutations |
| Backtracking without Trie | O(N^n * n²) | O(n²) | N = number of words, checking all words each level |
| Optimal (Trie + Backtracking) | O(N * n + R * n²) | O(N * n) | R = number of results, Trie enables pruning |

## Common Mistakes

1. **Not using a Trie for prefix lookup**
   ```python
   # Wrong: linear search for words with prefix
   def get_candidates(prefix):
       return [w for w in words if w.startswith(prefix)]
   # O(N * n) per call, very slow

   # Correct: Trie lookup
   class TrieNode:
       def __init__(self):
           self.children = {}
           self.words = []  # All words with this prefix
   # O(n) lookup per call
   ```

2. **Incorrect prefix calculation**
   ```python
   # Wrong: only checking one column
   prefix = square[row][col]

   # Correct: build prefix from current column
   prefix = ''.join(square[i][col] for i in range(row))
   # This is what the next word must start with
   ```

3. **Not handling word reuse**
   ```python
   # Wrong: marking words as used
   used = set()
   if word not in used:
       used.add(word)

   # Correct: words CAN be reused
   # Just backtrack without marking as used
   square.append(word)
   backtrack(square)
   square.pop()
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Valid Word Square | Easy | Just validate, don't generate |
| Word Search II | Hard | Similar Trie + backtracking on grid |
| Palindrome Pairs | Hard | Similar prefix/suffix matching with Trie |
| Construct K Palindrome Strings | Hard | Different constraint but similar backtracking |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Trie + Backtracking](../../strategies/data-structures/trie.md)
