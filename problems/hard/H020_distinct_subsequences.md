---
id: H020
old_id: F115
slug: distinct-subsequences
title: Distinct Subsequences
difficulty: hard
category: hard
topics: []
patterns: []
estimated_time_minutes: 45
---
# Distinct Subsequences

## Problem

Count the number of distinct subsequences of one string that equal another.

## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Examples

**Example 1:**
- Input: `s = "rabbbit", t = "rabbit"`
- Output: `3`
- Explanation: As shown below, there are 3 ways you can generate "rabbit" from s.
`**rabb**b**it**`
`**ra**b**bbit**`
`**rab**b**bit**`

**Example 2:**
- Input: `s = "babgbag", t = "bag"`
- Output: `5`
- Explanation: As shown below, there are 5 ways you can generate "bag" from s.
`**ba**b**g**bag`
`**ba**bgba**g**`
`**b**abgb**ag**`
`ba**b**gb**ag**`
`babg**bag**`

## Constraints

- 1 <= s.length, t.length <= 1000
- s and t consist of English letters.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

This is a classic dynamic programming problem about counting paths. When processing characters in s and t, at each position you have a choice: if s[i] == t[j], you can either use this character match (look at dp[i-1][j-1]) or skip it in s (look at dp[i-1][j]). If characters don't match, you must skip s[i]. The overlapping subproblems and optimal substructure make this perfect for DP.

</details>

<details>
<summary>🎯 Main Approach</summary>

Use a 2D DP table where dp[i][j] represents the number of distinct subsequences of s[0:i] that equal t[0:j]. Initialize dp[i][0] = 1 (empty t can be formed in one way from any s prefix) and dp[0][j] = 0 for j > 0 (non-empty t cannot be formed from empty s). For each cell: if s[i-1] == t[j-1], dp[i][j] = dp[i-1][j-1] + dp[i-1][j]; otherwise dp[i][j] = dp[i-1][j].

</details>

<details>
<summary>⚡ Optimization Tip</summary>

You can optimize space from O(m×n) to O(n) by using only one row, updating from right to left to avoid overwriting values you still need. Alternatively, observe that you only need the previous row and current row, so use two 1D arrays and swap them. Be careful with the update order to ensure you're using the correct previous values.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force Recursion | O(2^m) | O(m) | Try including/excluding each char in s |
| 2D Dynamic Programming | O(m×n) | O(m×n) | Optimal time, where m=len(s), n=len(t) |
| 1D DP (Space Optimized) | O(m×n) | O(n) | Same time, reduced space |

## Common Mistakes

1. **Incorrect initialization of base cases**
   ```python
   # Wrong: Not setting up base cases properly
   dp = [[0] * (n+1) for _ in range(m+1)]
   # Missing: dp[i][0] should be 1 for all i

   # Correct: Initialize base cases correctly
   dp = [[0] * (n+1) for _ in range(m+1)]
   for i in range(m+1):
       dp[i][0] = 1  # Empty t has one subsequence in any s
   # dp[0][j] = 0 for j > 0 is already set
   ```

2. **Wrong transition when characters match**
   ```python
   # Wrong: Only considering using the match
   if s[i-1] == t[j-1]:
       dp[i][j] = dp[i-1][j-1]  # Missing the skip case!

   # Correct: Add both using match and skipping
   if s[i-1] == t[j-1]:
       # Use this match + skip this char in s
       dp[i][j] = dp[i-1][j-1] + dp[i-1][j]
   else:
       # Can only skip current char in s
       dp[i][j] = dp[i-1][j]
   ```

3. **Incorrect space optimization update order**
   ```python
   # Wrong: Updating from left to right (overwrites needed values)
   for j in range(n+1):
       if s[i-1] == t[j-1]:
           dp[j] = dp[j-1] + dp[j]  # dp[j-1] already updated!

   # Correct: Update from right to left
   for j in range(n, 0, -1):
       if s[i-1] == t[j-1]:
           dp[j] = dp[j-1] + dp[j]  # dp[j-1] still has old value
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Edit Distance | Medium | Minimum operations instead of counting subsequences |
| Longest Common Subsequence | Medium | Find longest common subsequence length |
| Minimum Window Subsequence | Hard | Find minimum window containing t as subsequence |
| Number of Matching Subsequences | Medium | Multiple target strings to match |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (empty strings, no matches, all matches)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming - Subsequence](../../strategies/patterns/dynamic-programming.md)
