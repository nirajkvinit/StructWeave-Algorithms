---
id: M386
old_id: A228
slug: special-binary-string
title: Special Binary String
difficulty: medium
category: medium
topics: ["string"]
patterns: []
estimated_time_minutes: 30
---
# Special Binary String

## Problem

Think of this as rearranging balanced parentheses to get the "largest" arrangement possible. A **special binary string** has a unique structure that's identical to valid parentheses if you replace `1` with `(` and `0` with `)`.

Formally, a special binary string has two properties:
1. **Equal count**: The same number of `1`s and `0`s (like balanced parentheses)
2. **Prefix property**: Reading left to right, at any position, you've seen at least as many `1`s as `0`s (like valid parentheses - you can't close more than you've opened)

For example:
- `"1100"` is special: equal counts, and prefixes are `1` (1≥0 ✓), `11` (2≥0 ✓), `110` (2≥1 ✓), `1100` (2≥2 ✓)
- `"1010"` is NOT special: despite equal counts, at position 2 we have `10` (1 one, 1 zero, but next char is `1` making it valid up to there, but as a prefix `10` would mean we hit equal before the end)
- Actually `"1010"` IS special. Better example: `"0110"` is NOT special because it starts with `0` (0 ones < 1 zero ✗)

You're allowed to swap any two adjacent special substrings within the string. Your goal is to find the lexicographically maximum string possible. Since `'1' > '0'` in character ordering, you want `1`s to appear as early as possible.

Given a special binary string `s`, determine the lexicographically largest string you can create through any number of adjacent substring swaps.

## Why This Matters

This problem reveals a deep connection between binary strings and parentheses matching, a fundamental concept in compiler design, expression parsing, and tree traversal. The ability to recognize that special binary strings are isomorphic to balanced parentheses opens up powerful recursive decomposition strategies. This pattern appears in parsing arithmetic expressions, validating code syntax, and manipulating tree structures. The insight that you can recursively sort components to achieve lexicographic maximization is a key technique in string optimization problems frequently asked in technical interviews.

## Examples

**Example 1:**
- Input: `s = "11011000"`
- Output: `"11100100"`
- Explanation: By swapping the substring "10" (starting at index 1) with "1100" (starting at index 3), we achieve the lexicographically maximum result.

**Example 2:**
- Input: `s = "10"`
- Output: `"10"`

## Constraints

- 1 <= s.length <= 50
- s[i] is either '0' or '1'.
- s is a special binary string.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
Special binary strings are equivalent to valid parentheses (1='(', 0=')'). The key insight: any special string can be decomposed into non-overlapping special substrings. To maximize lexicographically, recursively sort these substrings in descending order (since '1' > '0', we want 1s earlier).
</details>

<details>
<summary>Main Approach</summary>
Use recursion with divide-and-conquer. Parse the string to identify all maximal special substrings at the current level (tracking balance counter, extract when counter returns to 0). Recursively process the "inside" of each substring (strip first '1' and last '0'). Sort the processed substrings in descending order, then concatenate.
</details>

<details>
<summary>Optimization Tip</summary>
The structure resembles balanced parentheses. Use a counter: increment for '1', decrement for '0'. When counter returns to 0, you've found a complete special substring. Extract it, recursively optimize its interior (between first 1 and last 0), collect all such optimized substrings, sort descending, and join.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n! * n) | O(n) | Try all permutations, infeasible |
| Recursive Sort | O(n² log n) | O(n) | Recursion depth * sorting at each level |

## Common Mistakes

1. **Not recognizing the parentheses pattern**
   ```python
   # Wrong: Try random swaps without structure
   for i in range(len(s)):
       swap_adjacent_substrings()

   # Correct: Treat as balanced parentheses problem
   # 1 -> '(', 0 -> ')', find matching pairs
   ```

2. **Incorrect substring extraction**
   ```python
   # Wrong: Don't identify complete special substrings
   substrings = s.split('0')  # incorrect split

   # Correct: Use counter to find balanced sections
   count = 0
   start = 0
   for i, char in enumerate(s):
       count += 1 if char == '1' else -1
       if count == 0:
           substrings.append(s[start:i+1])
   ```

3. **Sorting in wrong order**
   ```python
   # Wrong: Sort ascending or by length
   substrings.sort()  # ascending = lexicographically smaller

   # Correct: Sort descending for maximum
   substrings.sort(reverse=True)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Valid Parentheses | Easy | Basic validation of special strings |
| Different Ways to Add Parentheses | Medium | Parse and evaluate expressions |
| Score of Parentheses | Medium | Calculate score instead of rearrange |
| Remove Invalid Parentheses | Hard | Make string valid by removing chars |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Recursion and Divide-and-Conquer](../../strategies/patterns/recursion.md)
