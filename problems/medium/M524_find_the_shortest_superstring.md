---
id: M524
old_id: A410
slug: find-the-shortest-superstring
title: Find the Shortest Superstring
difficulty: medium
category: medium
topics: ["array", "string"]
patterns: ["backtrack-permutation"]
estimated_time_minutes: 30
---
# Find the Shortest Superstring

## Problem

Imagine you're building a DNA sequence assembly tool for genomics research. You have multiple DNA fragment strings, and you need to reconstruct the shortest possible complete sequence that contains all fragments. This is exactly what the shortest superstring problem solves.

Given an array of strings called `words`, find the shortest possible string that contains every string from `words` as a substring. The key optimization is finding overlaps between strings: if one word ends with characters that match the beginning of another word, you can merge them by overlapping those characters instead of simply concatenating.

For example, if you have words ["catg", "ctaagt", "gcta", "ttca", "atgcatc"], a naive concatenation would give you "catgctaagttcagclaatgcatc" (very long). But by cleverly overlapping shared characters, you can produce "gctaagttcatgcatc" which contains all five words as substrings in a much shorter result.

Important constraint: the problem guarantees that no word is completely contained within another word. This means you truly need all words in your final superstring.

If multiple strings achieve the minimum length, you can return any one of them.

## Why This Matters

The shortest superstring problem is a classic NP-hard problem with profound real-world applications. In bioinformatics, DNA sequencing machines produce millions of short "reads" (fragments) that must be assembled into complete genomes using overlap detection. In data compression, finding common substrings across text chunks enables better compression ratios. Text editors use similar algorithms for "find and replace all" operations across multiple patterns. Network packet reassembly employs this when fragments arrive out of order. The problem teaches dynamic programming with bitmasks, a powerful technique for optimization problems on small sets (up to 12-20 elements), which you'll encounter in traveling salesman problems, assignment problems, and subset optimization. The overlap maximization strategy appears in sequence alignment, string matching algorithms, and even compiler optimization for instruction scheduling.

## Examples

**Example 1:**
- Input: `words = ["alex","loves","algoprac"]`
- Output: `"alexlovesalgoprac"`
- Explanation: Any arrangement of these three words concatenated together would be valid.

**Example 2:**
- Input: `words = ["catg","ctaagt","gcta","ttca","atgcatc"]`
- Output: `"gctaagttcatgcatc"`

## Constraints

- 1 <= words.length <= 12
- 1 <= words[i].length <= 20
- words[i] consists of lowercase English letters.
- All the strings of words are **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
This is the "Shortest Superstring Problem" (NP-hard). The key is finding maximum overlap between word pairs, then determining the optimal order. With at most 12 words, dynamic programming with bitmasks becomes feasible.
</details>

<details>
<summary>Main Approach</summary>
DP with bitmasks:
1. Precompute overlap[i][j] = maximum overlap when word i comes before word j
2. Use DP where dp[mask][i] = minimum length when visiting words in 'mask' and ending at word i
3. Track parent pointers to reconstruct the path
4. Try all possible last words and reconstruct the shortest superstring
5. Build result by merging words according to precomputed overlaps
</details>

<details>
<summary>Optimization Tip</summary>
Computing overlaps efficiently: for each pair, check all possible overlap lengths starting from min(len(a), len(b)) down to 0. Use string slicing to compare suffixes and prefixes. The first match is the maximum overlap due to checking in descending order.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (All Permutations) | O(n! × n × m) | O(n × m) | m = avg word length |
| Optimal (DP + Bitmask) | O(2^n × n^2) | O(2^n × n) | Feasible for n ≤ 12 |

## Common Mistakes

1. **Not handling overlap calculation correctly**
   ```python
   # Wrong: Simple string concatenation without overlap
   result = ''.join(words_in_order)

   # Correct: Merge with overlap consideration
   def merge(word1, word2, overlap):
       return word1 + word2[overlap:]
   ```

2. **Missing edge case where one word contains another**
   ```python
   # Wrong: Assumes no containment (but problem states this)
   # Still good to verify in preprocessing

   # Correct: Problem guarantees no containment
   # But defensive coding can filter such cases
   words = [w for w in words if not any(w in other and w != other for other in words)]
   ```

3. **Incorrect bitmask state transitions**
   ```python
   # Wrong: Not checking if word is already used
   for j in range(n):
       new_mask = mask | (1 << j)

   # Correct: Only add unused words
   for j in range(n):
       if not (mask & (1 << j)):  # j not in mask
           new_mask = mask | (1 << j)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Concatenated Words | Hard | Find words that are concatenations of other words |
| Word Break II | Hard | Break string into dictionary words |
| Traveling Salesman Problem | Hard | Similar DP bitmask technique |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Bitmask DP Pattern](../../strategies/patterns/bitmask-dp.md)
