---
id: H025
old_id: F132
slug: palindrome-partitioning-ii
title: Palindrome Partitioning II
difficulty: hard
category: hard
topics: ["string"]
patterns: []
estimated_time_minutes: 45
---
# Palindrome Partitioning II

## Problem

Find the minimum cuts needed to partition a string into palindromes.

## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Examples

**Example 1:**
- Input: `s = "aab"`
- Output: `1`
- Explanation: The palindrome partitioning ["aa","b"] could be produced using 1 cut.

**Example 2:**
- Input: `s = "a"`
- Output: `0`

**Example 3:**
- Input: `s = "ab"`
- Output: `1`

## Constraints

- 1 <= s.length <= 2000
- s consists of lowercase English letters only.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Use dynamic programming with two components: precompute which substrings are palindromes using a 2D DP table, then use another DP array to find the minimum cuts needed. The key optimization is avoiding repeated palindrome checks.
</details>

<details>
<summary>🎯 Main Approach</summary>
First, build a 2D boolean table isPalindrome[i][j] indicating if substring s[i:j+1] is a palindrome. Then, create a 1D DP array cuts[i] representing minimum cuts needed for s[0:i+1]. For each position, try all possible last palindromes and take the minimum cuts needed.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Build the palindrome table using expand-around-center or DP (checking if s[i]==s[j] and isPalindrome[i+1][j-1]). This reduces palindrome checking from O(n) to O(1), bringing total complexity from O(n³) to O(n²).
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (recursion) | O(2^n) | O(n) | Try all possible partitions |
| DP with palindrome checks | O(n³) | O(n²) | Check palindrome for each substring |
| Optimized DP | O(n²) | O(n²) | Precompute palindromes |

## Common Mistakes

1. **Rechecking palindromes repeatedly**
   ```python
   # Wrong: O(n³) due to repeated palindrome checks
   def minCut(s):
       dp = [float('inf')] * len(s)
       for i in range(len(s)):
           for j in range(i + 1):
               if isPalindrome(s[j:i+1]):  # O(n) check each time
                   dp[i] = min(dp[i], dp[j-1] + 1 if j > 0 else 0)

   # Correct: Precompute palindromes
   def minCut(s):
       n = len(s)
       is_pal = [[False] * n for _ in range(n)]
       # Build palindrome table O(n²)
       for i in range(n-1, -1, -1):
           for j in range(i, n):
               is_pal[i][j] = (s[i] == s[j]) and (j-i <= 2 or is_pal[i+1][j-1])
       # Use precomputed table
   ```

2. **Wrong DP transition**
   ```python
   # Wrong: Not considering all possible last cuts
   dp[i] = dp[i-1] + 1 if is_palindrome[0][i] else float('inf')

   # Correct: Try all possible last palindromes
   for j in range(i + 1):
       if is_palindrome[j][i]:
           dp[i] = min(dp[i], (dp[j-1] if j > 0 else -1) + 1)
   ```

3. **Off-by-one in cut counting**
   ```python
   # Wrong: Counting palindromes instead of cuts
   return dp[n-1]  # This counts palindromes

   # Correct: Number of cuts = palindromes - 1
   return dp[n-1]  # Where dp[i] represents cuts, not palindromes
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Palindrome Partitioning | Medium | Return all valid partitions, not minimum cuts |
| Palindrome Partitioning III | Hard | Partition into k substrings with minimum changes |
| Palindrome Partitioning IV | Hard | Check if valid k-partition exists |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming Patterns](../../strategies/patterns/dynamic-programming.md)
