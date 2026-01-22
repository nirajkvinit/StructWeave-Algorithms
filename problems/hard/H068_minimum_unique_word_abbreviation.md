---
id: H068
old_id: I210
slug: minimum-unique-word-abbreviation
title: Minimum Unique Word Abbreviation
difficulty: hard
category: hard
topics: ["array", "string", "binary-search-tree"]
patterns: ["inorder-traversal"]
estimated_time_minutes: 45
strategy_ref: ../prerequisites/trees.md
---
# Minimum Unique Word Abbreviation

## Problem

You can abbreviate a word by replacing separated character sequences with numeric counts. For `"substitution"`, valid abbreviations include:

	- `"s10n"` (keep 's', replace 10 chars, keep 'n')
	- `"sub4u4"` (keep 'sub', replace 4 chars, keep 'u', replace 4 chars)
	- `"12"` (replace all characters)
	- `"su3i1u2on"` (multiple replacements)
	- `"substitution"` (no changes)

Invalid: `"s55n"` (the numeric portions represent touching sequences).

An abbreviation's **length** equals the count of kept letters plus the count of numeric substitutions. Examples: `"s10n"` has length `3` (2 letters + 1 number), while `"su3i1u2on"` has length `9` (6 letters + 3 numbers).

Your task: given a `target` word and a `dictionary` of words, find the shortest abbreviation of `target` that doesn't match any word in `dictionary`. Any valid shortest abbreviation is acceptable.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `target = "apple", dictionary = ["blade"]`
- Output: `"a4"`
- Explanation: While "5" is the shortest form, it also matches "blade". Between "a4" and "4e" (both length 2), only "a4" avoids matching "blade".

**Example 2:**
- Input: `target = "apple", dictionary = ["blade","plain","amber"]`
- Output: `"1p3"`
- Explanation: Shorter options all conflict: "5" matches all dictionary words, "a4" matches "amber", and "4e" matches "blade". The next shortest options like "1p3", "2p2", or "3l1" don't match any dictionary entries, so any is valid.

## Constraints

- m == target.length
- n == dictionary.length
- 1 <= m <= 21
- 0 <= n <= 1000
- 1 <= dictionary[i].length <= 100
- log₂(n) + m <= 21 if n > 0
- target and dictionary[i] consist of lowercase English letters.
- dictionary does not contain target.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Represent each abbreviation as a bitmask where 1 means "keep the character" and 0 means "abbreviate it". Generate abbreviations from shortest to longest (by counting number of 1s in bitmask). For each candidate, check if it matches any dictionary word. The first valid abbreviation is the shortest.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use bit manipulation to enumerate all 2^m possible abbreviations of the target word in order of increasing length (number of kept characters). For each bitmask, convert it to an abbreviation string and check if it could match any word in the dictionary by comparing lengths first, then character-by-character where the bitmask has 1s. Return the first abbreviation that doesn't match any dictionary word.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Pre-filter dictionary words by length - only keep words with the same length as target. Use a trie to store dictionary words for faster matching. Generate bitmasks in order of popcount (number of 1s) to ensure you try shorter abbreviations first. Early termination: if a 1-character abbreviation works, return immediately.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (all abbrevs) | O(2^m * n * m) | O(m) | m = target length, n = dictionary size |
| Optimal (ordered + pruning) | O(2^m * n * m) | O(n * m) | Same worst case but pruning helps in practice |
| With Trie optimization | O(2^m * m + n * m) | O(n * m) | Trie construction O(n*m), queries O(m) |

## Common Mistakes

1. **Not generating in length order**
   ```python
   # Wrong: trying abbreviations randomly
   for mask in range(2**m):
       abbrev = generate(mask)
       if valid(abbrev): return abbrev

   # Correct: sort by number of kept characters
   masks = sorted(range(2**m), key=lambda x: bin(x).count('1'))
   for mask in masks:
       abbrev = generate(mask)
       if valid(abbrev): return abbrev
   ```

2. **Incorrect abbreviation matching**
   ```python
   # Wrong: comparing abbreviation strings directly
   if abbrev == dict_word:
       return False

   # Correct: check if abbreviation matches pattern
   def matches(abbrev, word):
       if len(word) != len(target): return False
       i = j = 0
       while i < len(abbrev):
           if abbrev[i].isdigit():
               # Parse number and skip characters
           else:
               if abbrev[i] != word[j]: return False
   ```

3. **Not handling consecutive digits properly**
   ```python
   # Wrong: creating invalid abbreviations like "s55n"
   # Need to ensure numbers don't touch

   # Correct: when generating from bitmask
   # Consecutive 0s form ONE number
   result = []
   count = 0
   for i, bit in enumerate(bitmask):
       if bit == '0':
           count += 1
       else:
           if count > 0:
               result.append(str(count))
               count = 0
           result.append(target[i])
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Valid Word Abbreviation | Easy | Check if abbreviation matches word |
| Generalized Abbreviation | Medium | Generate all valid abbreviations |
| Word Abbreviation | Hard | Abbreviate list of words uniquely |
| Flip Game II | Medium | Similar bitmask enumeration |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Bit Manipulation](../../strategies/patterns/bit-manipulation.md)
