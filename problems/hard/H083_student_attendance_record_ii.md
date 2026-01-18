---
id: H083
old_id: A048
slug: student-attendance-record-ii
title: Student Attendance Record II
difficulty: hard
category: hard
topics: ["string"]
patterns: []
estimated_time_minutes: 45
---
# Student Attendance Record II

## Problem

A student's attendance record is represented by a string where characters indicate daily attendance: absent, late, or present. The record contains exactly three possible characters:

- `'A'`: Absent.
- `'L'`: Late.
- `'P'`: Present.

A student earns an attendance award when both criteria are met:

- Total absences (`'A'`) are strictly less than 2 days.
- The record never contains 3 or more consecutive late (`'L'`) days.

Given an integer `n`, calculate how many distinct attendance records of length `n` would make a student eligible for the award. Return the result modulo `10⁹ + 7`.

## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Examples

**Example 1:**
- Input: `n = 2`
- Output: `8`
- Explanation: There are 8 records with length 2 that are eligible for an award:
"PP", "AP", "PA", "LP", "PL", "AL", "LA", "LL"
Only "AA" is not eligible because there are 2 absences (there need to be fewer than 2).

**Example 2:**
- Input: `n = 1`
- Output: `3`

**Example 3:**
- Input: `n = 10101`
- Output: `183236316`

## Constraints

- 1 <= n <= 10⁵

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
This is a counting problem with constraints, not a generation problem. You need to count valid sequences, not enumerate them. The state depends on: position in sequence, number of A's used, and consecutive L's at the end. Use dynamic programming to track these states.
</details>

<details>
<summary>Main Approach</summary>
Define DP state as dp[i][j][k] = count of valid sequences of length i, with j absences (0 or 1), ending with k consecutive lates (0, 1, or 2). Transitions: add 'P' (resets consecutive lates), add 'A' (if j < 1), or add 'L' (if k < 2). Sum all valid states at position n.
</details>

<details>
<summary>Optimization Tip</summary>
Use space-optimized DP with rolling arrays since you only need the previous state. Also, since j is binary (0 or 1) and k is ternary (0, 1, 2), you only need 6 states at each step. Alternatively, use matrix exponentiation for very large n, though standard DP works for n ≤ 10^5.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(3^n) | O(n) | Generate all sequences, check validity |
| DP | O(n) | O(n) | Track states: position × absences × consecutive lates |
| Optimized DP | O(n) | O(1) | Rolling array with constant states |
| Matrix Exponentiation | O(log n) | O(1) | For very large n using 6×6 matrix |

## Common Mistakes

1. **Trying to generate all sequences instead of counting**
   ```python
   # Wrong: Exponential time complexity
   def count_records(n):
       count = 0
       for seq in generate_all_sequences(n):  # 3^n sequences
           if is_valid(seq):
               count += 1

   # Correct: Use DP to count directly
   dp = [[[0] * 3 for _ in range(2)] for _ in range(n + 1)]
   # Track valid counts without generating sequences
   ```

2. **Not handling the modulo operation correctly**
   ```python
   # Wrong: Only applying modulo at the end
   result = (dp[n][0][0] + dp[n][0][1] + dp[n][0][2] +
             dp[n][1][0] + dp[n][1][1] + dp[n][1][2])
   return result % MOD  # May overflow before modulo

   # Correct: Apply modulo at each step
   MOD = 10**9 + 7
   for i in range(n):
       dp[i+1][j][k] = (dp[i][j][k] + transition) % MOD
   ```

3. **Incorrect state transitions for consecutive lates**
   ```python
   # Wrong: Not tracking consecutive lates properly
   if add 'L':
       dp[i+1][j][2] = dp[i][j][1]  # Forgets about other L counts

   # Correct: Handle all consecutive late cases
   if add 'L':
       dp[i+1][j][1] = (dp[i+1][j][1] + dp[i][j][0]) % MOD  # 0 -> 1 L
       dp[i+1][j][2] = (dp[i+1][j][2] + dp[i][j][1]) % MOD  # 1 -> 2 L
       # Cannot add L if already have 2 consecutive
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Student Attendance Record I | Easy | Check if single record is valid |
| Count Binary Strings | Medium | Similar DP with different constraints |
| Decode Ways | Medium | Different constraint pattern but similar DP structure |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
