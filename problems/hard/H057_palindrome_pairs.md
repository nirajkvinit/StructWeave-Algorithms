---
id: H057
old_id: I135
slug: palindrome-pairs
title: Palindrome Pairs
difficulty: hard
category: hard
topics: ["array", "string"]
patterns: []
estimated_time_minutes: 45
---
# Palindrome Pairs

## Problem

You receive a **0-indexed** array named `words` containing **distinct** strings.

Define a **palindrome pair** as any two index positions `(i, j)` meeting these criteria:

	- Both indices fall within valid bounds: `0 <= i, j < words.length`
	- The indices are different: `i != j`
	- Joining `words[i]` and `words[j]` together produces a palindromic string

Find and return all such index pairs that create palindromes when their corresponding words are concatenated.

Your solution must achieve `O(sum of words[i].length)` time complexity.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `words = ["abcd","dcba","lls","s","sssll"]`
- Output: `[[0,1],[1,0],[3,2],[2,4]]`
- Explanation: These pairs create palindromes: ["abcddcba","dcbaabcd","slls","llssssll"]

**Example 2:**
- Input: `words = ["bat","tab","cat"]`
- Output: `[[0,1],[1,0]]`
- Explanation: Concatenating produces palindromes: ["battab","tabbat"]

**Example 3:**
- Input: `words = ["a",""]`
- Output: `[[0,1],[1,0]]`
- Explanation: Both orderings yield the palindrome "a"

## Constraints

- 1 <= words.length <= 5000
- 0 <= words[i].length <= 300
- words[i] consists of lowercase English letters.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
For words[i] + words[j] to be a palindrome, split words[i] into left and right parts. If left is a palindrome, check if reverse(right) exists in the word list. If right is a palindrome, check if reverse(left) exists. Use a hash map for O(1) lookups of reversed strings.
</details>

<details>
<summary>🎯 Main Approach</summary>
Build a map from word to index. For each word, try all possible splits (including empty prefix/suffix). For each split where one part is a palindrome, check if the reverse of the other part exists in the map. Handle empty string specially as it pairs with any palindrome word.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
For a word of length L, there are L+1 split positions. For each split, checking if a part is palindrome takes O(L). Total per word: O(L²). With N words: O(N×L²). Use a helper function to check palindromes efficiently, and be careful to avoid duplicate pairs and self-pairing.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n² × k) | O(1) | Check all pairs, k = max word length |
| Hash Map + Split | O(n × k²) | O(n × k) | Optimal for required complexity |
| Trie-based | O(n × k²) | O(n × k) | Alternative with similar complexity |

## Common Mistakes

1. **Not handling empty strings correctly**
   ```python
   # Wrong: Skipping empty string cases
   for i in range(len(words)):
       if words[i] == "":
           continue

   # Correct: Empty string pairs with any palindrome
   if "" in word_map:
       empty_idx = word_map[""]
       for i, word in enumerate(words):
           if i != empty_idx and is_palindrome(word):
               result.append([empty_idx, i])
               result.append([i, empty_idx])
   ```

2. **Creating duplicate pairs**
   ```python
   # Wrong: Adding same pair twice
   if reverse_right in word_map:
       result.append([i, word_map[reverse_right]])
   # Later also adds the reverse pair

   # Correct: Check index ordering to avoid duplicates
   if reverse_right in word_map and word_map[reverse_right] != i:
       j = word_map[reverse_right]
       result.append([i, j])
   ```

3. **Incorrect palindrome checking**
   ```python
   # Wrong: Not checking all split positions
   left = word[:len(word)//2]
   right = word[len(word)//2:]

   # Correct: Try all possible splits
   for j in range(len(word) + 1):
       left = word[:j]
       right = word[j:]
       if is_palindrome(left):
           # Check for reverse(right)
       if is_palindrome(right):
           # Check for reverse(left)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Longest Palindromic Substring | Medium | Single string instead of pairs |
| Valid Palindrome II | Easy | Allow one character deletion |
| Palindromic Substrings | Medium | Count all palindromic substrings |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Hash Map](../../strategies/data-structures/hash-table.md)
