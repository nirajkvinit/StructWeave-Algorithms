---
id: M444
old_id: A295
slug: count-unique-characters-of-all-substrings-of-a-given-string
title: Count Unique Characters of All Substrings of a Given String
difficulty: medium
category: medium
topics: ["string"]
patterns: []
estimated_time_minutes: 30
---
# Count Unique Characters of All Substrings of a Given String

## Problem

First, let's define a helper function `countUniqueChars(s)` that returns the number of characters appearing **exactly once** in string `s`. For example, if `s = "ALGOPRAC"`, the characters `'L'`, `'G'`, `'O'`, `'P'`, `'R'`, and `'C'` each appear exactly once, so `countUniqueChars(s) = 6`. Note that `'A'` appears twice, so it's not counted.

Now here's the challenge: given a string `s`, compute the **sum** of `countUniqueChars(t)` across **all possible non-empty substrings** `t` of `s`.

A substring is any contiguous sequence of characters within `s`. For instance, if `s = "ABC"`, the substrings are: `"A"`, `"B"`, `"C"`, `"AB"`, `"BC"`, and `"ABC"`. If the same substring appears multiple times at different positions in `s`, count each occurrence separately when computing the sum.

The problem boils down to: for every substring of `s`, count how many characters appear exactly once in that substring, then add up all these counts. The answer is guaranteed to fit in a 32-bit integer.

## Why This Matters

This problem introduces the **contribution technique**, a powerful optimization pattern where instead of processing all combinations, you calculate how many times each element contributes to the final answer. This approach transforms O(n²) or O(n³) brute force solutions into O(n) algorithms, a technique widely used in competitive programming and real-world applications like analytics systems (counting unique users per time window), substring analysis in bioinformatics, or character frequency analysis in natural language processing. Understanding this pattern will help you recognize similar optimization opportunities across different problem domains.

## Examples

**Example 1:**
- Input: `s = "ABC"`
- Output: `10`
- Explanation: All possible substrings are: "A","B","C","AB","BC" and "ABC". Every substring is composed with only unique letters. Sum of lengths of all substring is 1 + 1 + 1 + 2 + 2 + 3 = 10

**Example 2:**
- Input: `s = "ABA"`
- Output: `8`
- Explanation: The same as example 1, except countUniqueChars("ABA") = 1.

**Example 3:**
- Input: `s = "ALGOPRAC"`
- Output: `92`

## Constraints

- 1 <= s.length <= 10⁵
- s consists of uppercase English letters only.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Instead of counting all substrings (O(n²)) and checking unique characters (O(n)), think about the contribution of each character. For character at position i, count how many substrings contain it exactly once. This requires finding the nearest same character before and after position i.
</details>

<details>
<summary>🎯 Main Approach</summary>
For each character at index i, find its previous occurrence at index prev and next occurrence at index next. The number of substrings where this character appears exactly once is (i - prev) * (next - i). Sum these contributions across all positions. Handle boundaries by using -1 for prev when no previous occurrence exists, and len(s) for next when no next occurrence exists.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use a hash map to track the last occurrence of each character as you iterate through the string. For finding next occurrences, either do a second pass from right to left or precompute next occurrence indices. The formula (i - prev) * (next - i) counts all valid substring boundaries.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n³) | O(n) | Generate all substrings, count unique chars each |
| Optimized Brute Force | O(n²) | O(n) | Use sliding window for each start position |
| Optimal (Contribution) | O(n) | O(26) = O(1) | Process each character once, constant alphabet size |

## Common Mistakes

1. **Trying to enumerate all substrings explicitly**
   ```python
   # Wrong: Too slow for large inputs
   total = 0
   for i in range(len(s)):
       for j in range(i + 1, len(s) + 1):
           substring = s[i:j]
           unique_count = len(set(substring))
           total += unique_count

   # Correct: Count contribution of each character
   total = 0
   for i in range(len(s)):
       prev = last_occurrence[s[i]] if s[i] in last_occurrence else -1
       next = next_occurrence[s[i]] if s[i] in next_occurrence else len(s)
       total += (i - prev) * (next - i)
   ```

2. **Not handling boundary cases**
   ```python
   # Wrong: Crashes when character appears only once
   prev = last_seen[s[i]]  # KeyError if first occurrence
   next = next_seen[s[i]]  # KeyError if last occurrence

   # Correct: Use -1 and len(s) as boundaries
   prev = last_seen.get(s[i], -1)
   next = next_seen.get(s[i], len(s))
   contribution = (i - prev) * (next - i)
   ```

3. **Forgetting to update tracking structures**
   ```python
   # Wrong: Not updating last occurrence
   for i, char in enumerate(s):
       prev = last_seen.get(char, -1)
       # Compute contribution but forget to update
       total += contribution

   # Correct: Update tracking after using
   for i, char in enumerate(s):
       prev = last_seen.get(char, -1)
       total += (i - prev) * (next[i] - i)
       last_seen[char] = i  # Update for next iteration
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Count substrings with all unique characters | Medium | Different uniqueness constraint |
| Sum of distinct elements in all subarrays | Medium | Numeric array instead of string |
| Count unique characters in fixed-length substrings | Easy | Sliding window approach |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Contribution Technique](../../strategies/patterns/contribution.md) | [String Processing](../../strategies/fundamentals/string-processing.md)
