---
id: H010
old_id: F044
slug: wildcard-matching
title: Wildcard Matching
difficulty: hard
category: hard
topics: ["string"]
patterns: []
estimated_time_minutes: 45
---
# Wildcard Matching

## Problem

Implement wildcard pattern matching with '?' (any single char) and '*' (any sequence).

## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Examples

**Example 1:**
- Input: `s = "aa", p = "a"`
- Output: `false`
- Explanation: "a" does not match the entire string "aa".

**Example 2:**
- Input: `s = "aa", p = "*"`
- Output: `true`
- Explanation: '*' matches any sequence.

**Example 3:**
- Input: `s = "cb", p = "?a"`
- Output: `false`
- Explanation: '?' matches 'c', but the second letter is 'a', which does not match 'b'.

## Constraints

- 0 <= s.length, p.length <= 2000
- s contains only lowercase English letters.
- p contains only lowercase English letters, '?' or '*'.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

Unlike regular expressions where '*' repeats the preceding element, in wildcard matching '*' can match any sequence of characters (including empty). This makes it both simpler and trickier - simpler because you don't track what '*' is repeating, trickier because '*' can greedily consume varying amounts of the string. This is a classic dynamic programming problem with overlapping subproblems.

</details>

<details>
<summary>🎯 Main Approach</summary>

Use dynamic programming with a 2D table where dp[i][j] represents whether s[0:i] matches p[0:j]. For each position: if characters match or pattern has '?', copy dp[i-1][j-1]; if pattern has '*', it can match empty (dp[i][j-1]) or match one or more characters (dp[i-1][j]). The key is understanding '*' as "match zero or more of any character".

</details>

<details>
<summary>⚡ Optimization Tip</summary>

You can optimize space to O(n) by using only two rows (current and previous) since each cell only depends on the previous row and current row. Alternatively, use a greedy two-pointer approach: when you hit '*', remember its position and try matching characters; if mismatch occurs, backtrack to the '*' and try consuming more characters. This gives O(m*n) worst case but O(m+n) typical case.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force Recursion | O(2^(m+n)) | O(m+n) | Exponential - trying all '*' possibilities |
| Dynamic Programming (2D) | O(m×n) | O(m×n) | Optimal time, where m=len(s), n=len(p) |
| DP Space Optimized | O(m×n) | O(n) | Same time, reduced space |
| Greedy Two Pointers | O(m×n) | O(1) | Best average case, same worst case |

## Common Mistakes

1. **Not handling multiple consecutive asterisks**
   ```python
   # Wrong: Treating each '*' separately
   if p[j] == '*':
       dp[i][j] = dp[i-1][j] or dp[i][j-1]
   # Misses that "**" should behave like single '*'

   # Correct: Collapse consecutive asterisks during preprocessing
   # Or handle in DP transition
   if p[j] == '*':
       # Match empty sequence
       dp[i][j] = dp[i][j-1]
       # Match one or more characters
       for k in range(i+1):
           dp[i][j] |= dp[k][j-1]
   # Better: dp[i][j] = dp[i][j-1] or dp[i-1][j]
   ```

2. **Forgetting '*' can match empty sequence**
   ```python
   # Wrong: Only considering '*' matching characters
   if p[j] == '*':
       dp[i][j] = dp[i-1][j]  # Only matching one or more chars

   # Correct: Also consider matching zero characters
   if p[j] == '*':
       # Match zero chars OR match one+ chars
       dp[i][j] = dp[i][j-1] or (i > 0 and dp[i-1][j])
   ```

3. **Incorrect initialization for patterns starting with '*'**
   ```python
   # Wrong: Not setting up base case for leading '*'
   dp[0][0] = True
   # Pattern "*abc" should match empty string up to the '*'

   # Correct: Handle leading asterisks in pattern
   dp[0][0] = True
   for j in range(1, len(p) + 1):
       if p[j-1] == '*':
           dp[0][j] = dp[0][j-1]  # '*' can match empty
       else:
           break  # Non-'*' can't match empty string
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Regular Expression Matching (H002) | Hard | '*' repeats preceding element, not any sequence |
| Edit Distance | Medium | Counts operations instead of pattern matching |
| Implement strStr() | Easy | Simple substring matching |
| String Matching with Wildcards (Multiple '*') | Hard | Same problem, optimization focus |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (empty strings, multiple '*', pattern longer than string)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
