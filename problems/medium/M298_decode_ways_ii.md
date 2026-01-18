---
id: M298
old_id: A106
slug: decode-ways-ii
title: Decode Ways II
difficulty: medium
category: medium
topics: ["string", "dynamic-programming"]
patterns: ["dynamic-programming"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M091", "M095", "M639"]
prerequisites: ["E070", "M091"]
---
# Decode Ways II

## Problem

You're given an encoded string where letters A-Z have been converted to numbers: 'A'→"1", 'B'→"2", ..., 'Z'→"26". Your task is to count how many ways the string can be decoded back into letters, but with a twist: the string contains wildcard `'*'` characters.

First, understand basic decoding without wildcards. The string `"11106"` can be split into valid letter codes in multiple ways:
- `(1)(1)(10)(6)` → "AAJF"
- `(11)(10)(6)` → "KJF"

Note that `(1)(11)(06)` is invalid because "06" doesn't map to any letter (leading zeros aren't allowed - only "6" maps to 'F').

Now add wildcards: `'*'` can represent any single digit from '1' to '9' (not '0'). This multiplies the possibilities:

- `"*"` can be decoded in 9 ways: "1" through "9" (letters A-I)
- `"1*"` can be decoded in 18 ways:
  - The `*` expands to create "11", "12", "13", ..., "19"
  - Each resulting string can be decoded as one two-digit code OR two single-digit codes
  - For example, "11" can be "(11)" or "(1)(1)"
- `"2*"` can be decoded in 15 ways:
  - "21"-"26" each allow 2 decodings (single or double-digit)
  - "27"-"29" each allow 1 decoding (only single-digit, since 27-29 > 26)

Given a string `s` with digits and `'*'` characters, count the total number of ways to decode it. Return the answer modulo 10⁹ + 7 since the count can be enormous.

## Why This Matters

This problem extends a classic dynamic programming problem (Decode Ways) with wildcards, dramatically increasing the complexity. It teaches you to handle combinatorial explosion carefully: each `*` multiplies possibilities, and you must count exactly how many valid decodings each wildcard pattern creates. This type of "count the ways" problem with constraints appears frequently in dynamic programming: counting paths in a grid with obstacles, ways to climb stairs with variable step sizes, or ways to partition strings. The wildcard handling teaches precision in case analysis - you must enumerate all combinations (digit-digit, digit-star, star-digit, star-star) and count valid letter codes for each. Skills learned here apply to parsing ambiguous grammars, counting valid sequences in formal languages, and any problem where choices cascade through a sequence.

## Examples

**Example 1:**
- Input: `s = "*"`
- Output: `9`
- Explanation: The wildcard can represent "1" through "9", corresponding to letters "A" through "I". This yields 9 distinct decodings.

**Example 2:**
- Input: `s = "1*"`
- Output: `18`
- Explanation: The wildcard expands this to "11", "12", "13", "14", "15", "16", "17", "18", or "19". Each of these strings can be decoded in 2 ways (either as two single-digit codes or one two-digit code, where valid). For example, "11" decodes to "AA" or "K". Total: 9 expansions × 2 decodings = 18.

**Example 3:**
- Input: `s = "2*"`
- Output: `15`
- Explanation: The wildcard creates "21" through "29". The strings "21" through "26" each allow 2 decodings (two single digits or one two-digit code), while "27", "28", and "29" permit only 1 decoding each (two single digits only, since they exceed 26). Total: (6 × 2) + (3 × 1) = 15.

## Constraints

- 1 <= s.length <= 10⁵
- s[i] is a digit or '*'.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Identify the DP State</summary>

This is an extension of the classic Decode Ways problem with wildcards. Think about how many ways you can decode up to position `i`. The key insight is that at each position, you can either:
- Take one character (if it forms a valid single-digit code)
- Take two characters (if they form a valid two-digit code)

Define `dp[i]` as the number of ways to decode the substring `s[0...i-1]`. The wildcard makes counting more complex because each `'*'` represents multiple possibilities.

</details>

<details>
<summary>Hint 2: Handle Single and Double Character Cases</summary>

For each position, calculate two contributions:
1. **Single character**: If `s[i]` is a valid single digit (1-9), count ways from `dp[i-1]`
   - If `s[i]` is `'*'`, it can be 1-9, contributing `9 * dp[i-1]`
   - If `s[i]` is '1'-'9', it contributes `1 * dp[i-1]`
   - If `s[i]` is '0', it cannot be decoded alone

2. **Two characters**: If `s[i-1:i+1]` forms a valid two-digit code (10-26), count ways from `dp[i-2]`
   - Handle all combinations: digit-digit, digit-star, star-digit, star-star
   - Be careful with ranges (e.g., "2*" can be 20-26, only 6 valid codes)

</details>

<details>
<summary>Hint 3: Optimize Space and Handle Modulo</summary>

You only need the previous two states (`dp[i-1]` and `dp[i-2]`), so optimize to O(1) space using two variables.

Remember to apply modulo `10⁹ + 7` at each step to prevent integer overflow:
- After computing single character contribution
- After computing two character contribution
- When adding contributions together

The tricky part is counting exact multipliers for each wildcard combination. Create helper functions to calculate how many valid codes each pattern represents.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Dynamic Programming | O(n) | O(n) | Basic DP with array |
| Space-Optimized DP | O(n) | O(1) | Using two variables for previous states |
| Recursive + Memoization | O(n) | O(n) | Recursion stack + cache |

**Recommended**: Space-optimized DP for O(1) space and clean implementation.

## Common Mistakes

1. **Forgetting edge cases for wildcards**
```python
# Wrong: Not handling all wildcard combinations
if s[i] == '*':
    ways = 9 * dp[i-1]  # Missing two-character cases

# Correct: Handle both single and two-character cases
if s[i] == '*':
    ways = 9 * dp[i-1]
    if i > 0:
        if s[i-1] == '1':
            ways += 9 * dp[i-2]  # 11-19
        elif s[i-1] == '2':
            ways += 6 * dp[i-2]  # 21-26
```

2. **Not applying modulo consistently**
```python
# Wrong: Only applying modulo at the end
result = (single_ways + double_ways) % MOD

# Correct: Apply modulo at each step
single_ways = (single_ways) % MOD
double_ways = (double_ways) % MOD
result = (single_ways + double_ways) % MOD
```

3. **Incorrect handling of '0' with wildcards**
```python
# Wrong: Allowing '*0' to be decoded as 10-90
if s[i] == '0' and s[i-1] == '*':
    ways = 9 * dp[i-2]  # Incorrect! Only 10, 20 are valid

# Correct: Only 10 and 20 are valid
if s[i] == '0' and s[i-1] == '*':
    ways = 2 * dp[i-2]  # Only '1' and '2' make valid codes
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Basic Decode Ways | Medium | Without wildcards, simpler DP |
| Decode Ways with Range | Hard | Wildcards can represent ranges like [1-5] |
| Maximum Decode Value | Hard | Each decoding has a value, maximize sum |
| Decode with Constraints | Hard | Additional rules like no consecutive same letters |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Solve basic version without wildcards first
- [ ] Identify all wildcard combination cases (digit-digit, digit-star, star-digit, star-star)
- [ ] Implement helper functions to count valid codes per pattern
- [ ] Handle edge cases (leading zeros, empty strings, all wildcards)
- [ ] Optimize from O(n) space to O(1) space
- [ ] Review after 1 day: Can you recall the wildcard counting logic?
- [ ] Review after 1 week: Implement without looking at notes
- [ ] Review after 1 month: Solve a variation or related problem

**Strategy**: See [Dynamic Programming Pattern](../strategies/patterns/dynamic-programming.md)
