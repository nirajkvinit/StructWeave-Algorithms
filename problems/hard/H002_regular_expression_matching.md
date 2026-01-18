---
id: H002
old_id: F010
slug: regular-expression-matching
title: Regular Expression Matching
difficulty: hard
category: hard
topics: []
patterns: []
estimated_time_minutes: 45
---
# Regular Expression Matching

## Problem

Implement pattern matching with '.' (any single character) and '*' (zero or more of preceding element).

## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Examples

**Example 1:**
- Input: `s = "aa", p = "a"`
- Output: `false`
- Explanation: "a" does not match the entire string "aa".

**Example 2:**
- Input: `s = "aa", p = "a*"`
- Output: `true`
- Explanation: '*' means zero or more of the preceding element, 'a'. Therefore, by repeating 'a' once, it becomes "aa".

**Example 3:**
- Input: `s = "ab", p = ".*"`
- Output: `true`
- Explanation: ".*" means "zero or more (*) of any character (.)".

## Constraints

- 1 <= s.length <= 20
- 1 <= p.length <= 20
- s contains only lowercase English letters.
- p contains only lowercase English letters, '.', and '*'.
- It is guaranteed for each appearance of the character '*', there will be a previous valid character to match.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

The problem has overlapping subproblems - whether `s[i:]` matches `p[j:]` depends on whether smaller substrings match. When you see a '*', you need to decide whether to use it for 0, 1, or more characters. This recursive structure with repeated subproblems is a classic indicator for dynamic programming.

</details>

<details>
<summary>🎯 Main Approach</summary>

Use a 2D DP table where `dp[i][j]` represents whether `s[0:i]` matches `p[0:j]`. The tricky part is handling the '*' character - it can either match zero occurrences of the preceding element (look at `dp[i][j-2]`) or match one or more occurrences (check if current characters match and look at `dp[i-1][j]`). Handle '.' by treating it as a match for any single character.

</details>

<details>
<summary>⚡ Optimization Tip</summary>

You can optimize space from O(m×n) to O(n) by using only two rows (current and previous), since each cell only depends on cells from the current row and the previous row. Also, handle edge cases carefully: empty string with pattern "a*b*c*" should match because each '*' can represent zero occurrences.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force Recursion | O(2^(m+n)) | O(m+n) | Exponential due to exploring all '*' possibilities |
| Dynamic Programming (2D) | O(m×n) | O(m×n) | Optimal time, where m=len(s), n=len(p) |
| DP Space Optimized | O(m×n) | O(n) | Same time, reduced space |

## Common Mistakes

1. **Forgetting to handle '*' matching zero occurrences**
   ```python
   # Wrong: Only checking if '*' matches one or more characters
   if p[j] == '*':
       dp[i][j] = dp[i-1][j]  # Only checks matching one more char

   # Correct: Also check matching zero occurrences
   if j >= 1 and p[j] == '*':
       # Zero occurrences: ignore current char and '*'
       dp[i][j] = dp[i][j-2]
       # One or more: check if chars match and previous state
       if i >= 1 and (p[j-1] == s[i-1] or p[j-1] == '.'):
           dp[i][j] |= dp[i-1][j]
   ```

2. **Incorrect base case initialization**
   ```python
   # Wrong: Not handling patterns like "a*b*" matching empty string
   dp = [[False] * (n+1) for _ in range(m+1)]
   dp[0][0] = True

   # Correct: Initialize first row for patterns with '*'
   dp = [[False] * (n+1) for _ in range(m+1)]
   dp[0][0] = True
   for j in range(2, n+1):
       if p[j-1] == '*':
           dp[0][j] = dp[0][j-2]  # '*' can eliminate preceding char
   ```

3. **Confusing '*' with any character matcher**
   ```python
   # Wrong: Treating '*' as matching any sequence
   if p[j] == '*':
       dp[i][j] = True  # Incorrect!

   # Correct: '*' repeats the PRECEDING character
   if p[j] == '*':
       # Must check if preceding char matches current char in s
       if p[j-1] == s[i-1] or p[j-1] == '.':
           dp[i][j] = dp[i-1][j]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Wildcard Matching (H010) | Hard | Uses '?' (any char) and '*' (any sequence), simpler semantics |
| Edit Distance | Medium | Counts minimum operations instead of boolean match |
| String to String Matching | Easy | No wildcards, direct comparison |
| Pattern Matching with Multiple Wildcards | Hard | More complex wildcard rules |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (empty strings, multiple consecutive '*', etc.)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
