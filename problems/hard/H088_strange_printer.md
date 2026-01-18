---
id: H088
old_id: A131
slug: strange-printer
title: Strange Printer
difficulty: hard
category: hard
topics: ["string"]
patterns: []
estimated_time_minutes: 45
---
# Strange Printer

## Problem

You have access to a printer that operates under two unique constraints:

	- Each print operation can only output identical characters in a continuous sequence.
	- When printing, you can select any starting and ending positions, and newly printed characters will overwrite whatever was previously there.

Your task is to determine the minimum number of print operations required to produce a given string `s`.

## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Examples

**Example 1:**
- Input: `s = "aaabbb"`
- Output: `2`
- Explanation: First operation prints three 'a' characters, second operation prints three 'b' characters.

**Example 2:**
- Input: `s = "aba"`
- Output: `2`
- Explanation: First operation prints three 'a' characters across the entire length, then a second operation overwrites the middle position with 'b'.

## Constraints

- 1 <= s.length <= 100
- s consists of lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
When printing a sequence of identical characters, you can print extra characters beyond what you need and later overwrite them. For example, to print "aba", you can print "aaa" first, then overwrite the middle 'a' with 'b'. This means if s[i] == s[j], you might be able to merge two print operations into one.
</details>

<details>
<summary>Main Approach</summary>
Use interval DP. Define dp[i][j] = minimum prints needed for substring s[i..j]. For each interval, try all possible split points k. The key insight: if s[i] == s[k], you can print s[i..k] in one operation (since you can extend s[i] all the way to k), then handle the rest. The recurrence considers both splitting and merging opportunities.
</details>

<details>
<summary>Optimization Tip</summary>
Preprocess the string to remove consecutive duplicates (e.g., "aaabbb" becomes "ab") since consecutive identical characters can always be printed in one operation. This significantly reduces the problem size. Also, when s[i] == s[j], you can use dp[i][j] = dp[i][j-1] as a starting point.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(2^n) | O(n) | Try all possible print sequences |
| Interval DP | O(n^3) | O(n^2) | n^2 states, O(n) transitions each |

## Common Mistakes

1. **Not considering the character merging optimization**
   ```python
   # Wrong: Always splitting intervals independently
   def min_prints(s, i, j):
       if i > j:
           return 0
       result = 1 + min_prints(s, i+1, j)  # Print s[i] alone
       # Missing: check if s[i] can merge with later positions

   # Correct: Consider merging when characters match
   def min_prints(s, i, j):
       if i > j:
           return 0
       result = 1 + min_prints(s, i+1, j)
       for k in range(i+1, j+1):
           if s[i] == s[k]:
               result = min(result, min_prints(s, i, k-1) + min_prints(s, k+1, j))
   ```

2. **Forgetting to remove consecutive duplicates**
   ```python
   # Wrong: Processing raw string
   dp = [[0] * len(s) for _ in range(len(s))]
   # This includes redundant work for "aaa" which is same as "a"

   # Correct: Preprocess to remove consecutive duplicates
   compressed = [s[0]]
   for i in range(1, len(s)):
       if s[i] != s[i-1]:
           compressed.append(s[i])
   s = ''.join(compressed)
   ```

3. **Incorrect DP recurrence**
   ```python
   # Wrong: Not handling base case when s[i] == s[j]
   if i == j:
       dp[i][j] = 1
   else:
       dp[i][j] = 1 + dp[i+1][j]  # Always adds 1

   # Correct: Special case when boundaries match
   if i == j:
       dp[i][j] = 1
   elif s[i] == s[j]:
       dp[i][j] = dp[i][j-1]  # Can extend the print of s[i] to cover s[j]
   else:
       dp[i][j] = 1 + dp[i+1][j]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Minimum Cost to Paint Houses | Medium | Different cost model but similar DP structure |
| Burst Balloons | Hard | Similar interval DP approach |
| Remove Boxes | Hard | Extended version with more complex state |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Interval Dynamic Programming](../../strategies/patterns/interval-dp.md)
