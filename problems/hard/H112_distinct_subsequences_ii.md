---
id: H112
old_id: A407
slug: distinct-subsequences-ii
title: Distinct Subsequences II
difficulty: hard
category: hard
topics: ["string"]
patterns: []
estimated_time_minutes: 45
---
# Distinct Subsequences II

## Problem

Given a string `s`, calculate the count of all **distinct non-empty subsequences** that can be formed from it. Since this count may be extremely large, return the result **modulo** `10⁹ + 7`.

A **subsequence** is derived by removing zero or more characters from the original string while preserving the order of the remaining characters. For example, `"ace"` is a valid subsequence of `"abcde"`, but `"aec"` is not (order is violated).

## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Examples

**Example 1:**
- Input: `s = "abc"`
- Output: `7`
- Explanation: The 7 distinct subsequences are "a", "b", "c", "ab", "ac", "bc", and "abc".

**Example 2:**
- Input: `s = "aba"`
- Output: `6`
- Explanation: The 6 distinct subsequences are "a", "b", "ab", "aa", "ba", and "aba".

**Example 3:**
- Input: `s = "aaa"`
- Output: `3`
- Explanation: The 3 distinct subsequences are "a", "aa" and "aaa".

## Constraints

- 1 <= s.length <= 2000
- s consists of lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
When you process each character, you can append it to all existing subsequences to create new ones. The key challenge is handling duplicates: if you've seen a character before, some "new" subsequences will be duplicates of ones created earlier.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use dynamic programming where dp[i] represents the count of distinct subsequences using the first i characters. When processing character c at position i, you double the count (each existing subsequence can include or exclude c), then subtract duplicates created by the last occurrence of character c. Track the last position where each character appeared.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Instead of maintaining a full DP array, keep track of the contribution of each character. For each character c, store how many subsequences ended with c the last time it appeared. This allows O(1) duplicate detection: total = (prev_total * 2 + 1 - last_count[c]) % MOD.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(2^n) | O(2^n) | Generate all subsequences, use set for uniqueness |
| DP with Array | O(n) | O(n) | Track count at each position |
| Optimal DP | O(n) | O(1) | Use constant space with character count map |

## Common Mistakes

1. **Not Handling Duplicates Correctly**
   ```python
   # Wrong: Simply doubling the count
   for c in s:
       count = count * 2 + 1  # Overcounts duplicates

   # Correct: Subtract previous contribution of same character
   last = {}
   total = 0
   for c in s:
       new_total = (total * 2 + 1) % MOD
       if c in last:
           new_total = (new_total - last[c]) % MOD
       last[c] = total + 1
       total = new_total
   ```

2. **Forgetting the Modulo Operation**
   ```python
   # Wrong: Not applying modulo consistently
   total = total * 2 + 1
   if c in last:
       total = total - last[c]  # Could become negative or overflow

   # Correct: Apply modulo at each step
   MOD = 10**9 + 7
   total = (total * 2 + 1) % MOD
   if c in last:
       total = (total - last[c] + MOD) % MOD
   ```

3. **Off-by-One in Counting**
   ```python
   # Wrong: Not adding 1 for the new single-character subsequence
   for c in s:
       total = total * 2  # Misses the subsequence of just 'c'

   # Correct: Add 1 for the new subsequence
   for c in s:
       total = (total * 2 + 1) % MOD
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Distinct Subsequences I | Hard | Count subsequences of s that equal t (different problem) |
| Number of Unique Substrings | Medium | Contiguous characters instead of subsequences |
| Count Palindromic Subsequences | Hard | Additional palindrome constraint |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
