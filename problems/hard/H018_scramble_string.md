---
id: H018
old_id: F087
slug: scramble-string
title: Scramble String
difficulty: hard
category: hard
topics: ["string", "recursion"]
patterns: []
estimated_time_minutes: 45
---
# Scramble String

## Problem

Determine if one string is a scrambled version of another using binary tree swaps.

## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Examples

**Example 1:**
- Input: `s1 = "great", s2 = "rgeat"`
- Output: `true`
- Explanation: One possible scenario applied on s1 is:
"great" --> "gr/eat" // divide at random index.
"gr/eat" --> "gr/eat" // random decision is not to swap the two substrings and keep them in order.
"gr/eat" --> "g/r / e/at" // apply the same algorithm recursively on both substrings. divide at random index each of them.
"g/r / e/at" --> "r/g / e/at" // random decision was to swap the first substring and to keep the second substring in the same order.
"r/g / e/at" --> "r/g / e/ a/t" // again apply the algorithm recursively, divide "at" to "a/t".
"r/g / e/ a/t" --> "r/g / e/ a/t" // random decision is to keep both substrings in the same order.
The algorithm stops now, and the result string is "rgeat" which is s2.
As one possible scenario led s1 to be scrambled to s2, we return true.

**Example 2:**
- Input: `s1 = "abcde", s2 = "caebd"`
- Output: `false`

**Example 3:**
- Input: `s1 = "a", s2 = "a"`
- Output: `true`

## Constraints

- s1.length == s2.length
- 1 <= s1.length <= 30
- s1 and s2 consist of lowercase English letters.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

A scrambled string can be formed by recursively splitting and optionally swapping at each level. For s1 to be a scramble of s2, there must exist a split point where either: (1) left(s1) scrambles to left(s2) AND right(s1) scrambles to right(s2), OR (2) left(s1) scrambles to right(s2) AND right(s1) scrambles to left(s2). This recursive structure with overlapping subproblems suggests dynamic programming or memoized recursion.

</details>

<details>
<summary>🎯 Main Approach</summary>

Use recursive divide-and-conquer with memoization. For each possible split point i (1 to len-1), check two cases: (1) no swap - compare s1[0:i] with s2[0:i] and s1[i:] with s2[i:], (2) swap - compare s1[0:i] with s2[len-i:] and s1[i:] with s2[0:len-i]. Base cases: if strings are equal return True, if sorted strings differ return False (quick pruning). Memoize results keyed by (s1, s2) to avoid recomputation.

</details>

<details>
<summary>⚡ Optimization Tip</summary>

Before recursing, quickly check if s1 and s2 have the same character frequencies by comparing sorted strings or using a character count map - if they differ, return False immediately. Use a 3D DP table dp[length][i][j] where length is substring length, i is start in s1, j is start in s2, to avoid string slicing overhead. This reduces both time and space complexity by operating on indices rather than creating new strings.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force Recursion | O(4^n) | O(n) | Try all split points and swap combinations |
| Memoized Recursion | O(n^4) | O(n^3) | Cache results, but string keys are expensive |
| 3D DP (Optimal) | O(n^4) | O(n^3) | Bottom-up DP with index-based approach |

## Common Mistakes

1. **Not pruning with character frequency check**
   ```python
   # Wrong: Always recursing without quick rejection
   def isScramble(s1, s2):
       if s1 == s2:
           return True
       # Immediately try all splits - very slow!

   # Correct: Check character frequencies first
   def isScramble(s1, s2):
       if s1 == s2:
           return True
       if sorted(s1) != sorted(s2):  # Quick pruning!
           return False
       # Now try splits...
   ```

2. **Forgetting to check both swap and no-swap cases**
   ```python
   # Wrong: Only checking one case (no swap)
   for i in range(1, n):
       if isScramble(s1[:i], s2[:i]) and isScramble(s1[i:], s2[i:]):
           return True

   # Correct: Check both no-swap AND swap cases
   for i in range(1, n):
       # Case 1: No swap
       if isScramble(s1[:i], s2[:i]) and isScramble(s1[i:], s2[i:]):
           return True
       # Case 2: Swap
       if isScramble(s1[:i], s2[n-i:]) and isScramble(s1[i:], s2[:n-i]):
           return True
   ```

3. **Inefficient memoization with string concatenation**
   ```python
   # Wrong: Using expensive string slicing in memoization
   memo = {}
   def helper(s1, s2):
       key = s1 + '#' + s2  # Creates new strings repeatedly
       # ... Creates many intermediate strings

   # Correct: Use indices to avoid string slicing
   memo = {}
   def helper(i1, i2, length):
       key = (i1, i2, length)  # Just tuples, no string creation
       # Work with original strings s1[i1:i1+length], s2[i2:i2+length]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Interleaving String | Medium | Merge two strings, simpler recursion |
| Different Ways to Add Parentheses | Medium | Similar divide-and-conquer structure |
| Burst Balloons | Hard | Different DP problem with interval splitting |
| Palindrome Partitioning II | Hard | Partition with different objective |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (equal strings, single character, impossible scrambles)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming - Interval](../../strategies/patterns/dynamic-programming.md)
