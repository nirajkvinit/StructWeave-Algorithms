---
id: H033
old_id: I014
slug: shortest-palindrome
title: Shortest Palindrome
difficulty: hard
category: hard
topics: ["string"]
patterns: []
estimated_time_minutes: 45
---
# Shortest Palindrome

## Problem

Transform a string into a palindrome by prepending characters to its beginning.

Find the minimal-length palindrome that can be created through this prefix-only modification.

## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Examples

**Example 1:**
- Input: `s = "aacecaaa"`
- Output: `"aaacecaaa"`

**Example 2:**
- Input: `s = "abcd"`
- Output: `"dcbabcd"`

## Constraints

- 0 <= s.length <= 5 * 10⁴
- s consists of lowercase English letters only.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>Key Insight</summary>
Find the longest palindromic prefix of the string. Whatever remains after this prefix needs to be reversed and prepended. For example, if "aacecaa" has longest palindromic prefix "aacecaa", we add nothing. If only "a" is palindrome, we reverse and prepend the rest.
</details>

<details>
<summary>Main Approach</summary>
Use KMP (Knuth-Morris-Pratt) algorithm. Create a combined string: s + '#' + reverse(s). The '#' separator prevents overlap. Compute the KMP failure function (LPS array) for this combined string. The last value in the LPS array tells you the longest prefix of s that is also a suffix of reverse(s), which is the longest palindromic prefix.
</details>

<details>
<summary>Optimization Tip</summary>
The KMP approach runs in O(n) time. Alternative approaches like checking each position for palindrome center work but are O(n^2). For the KMP failure function, remember that lps[i] represents the length of longest proper prefix which is also suffix for substring [0...i].
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n^2) | O(n) | Check each position as potential palindrome end |
| Two Pointers | O(n^2) | O(1) | Expand around center for each position |
| Optimal (KMP) | O(n) | O(n) | Use failure function to find longest palindrome prefix |
| Rolling Hash | O(n) | O(1) | Hash-based palindrome check with collision risk |

## Common Mistakes

1. **Not using separator in KMP string**
   ```python
   # Wrong: s and reverse(s) can create false matches
   combined = s + s[::-1]

   # Correct: Use separator to prevent overlap
   combined = s + '#' + s[::-1]
   ```

2. **Misunderstanding what to prepend**
   ```python
   # Wrong: Prepending the reverse of entire string
   return s[::-1] + s

   # Correct: Only prepend reverse of non-palindrome suffix
   palindrome_len = lps[-1]
   return s[palindrome_len:][::-1] + s
   ```

3. **Incorrect KMP failure function**
   ```python
   # Wrong: Not handling mismatch correctly
   while j > 0 and s[i] != s[j]:
       j -= 1  # Should use lps[j-1], not decrement

   # Correct: Use failure function for backtracking
   while j > 0 and s[i] != s[j]:
       j = lps[j - 1]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Valid Palindrome | Easy | Check if string is palindrome |
| Longest Palindromic Substring | Medium | Find longest palindrome anywhere in string |
| Palindrome Pairs | Hard | Find pairs of words that form palindrome |
| Palindrome Partitioning | Medium | Partition string into all palindrome substrings |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [KMP Pattern Matching](../../strategies/patterns/string-matching.md)
