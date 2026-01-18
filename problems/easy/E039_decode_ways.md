---
id: E039
old_id: F091
slug: decode-ways
title: Decode Ways
difficulty: easy
category: easy
topics: ["string"]
patterns: []
estimated_time_minutes: 15
frequency: high
related_problems: ["E018", "M053", "M062"]
prerequisites: ["dynamic-programming", "string-processing"]
strategy_ref: ../../strategies/patterns/dynamic-programming.md
---
# Decode Ways

## Problem

You have a message that was encoded by mapping letters to numbers: 'A' maps to '1', 'B' maps to '2', and so on up to 'Z' mapping to '26'. Given a string of digits representing an encoded message, determine how many different ways you can decode it back into letters.

For example, the digit string "12" could be decoded as either "AB" (treating it as '1' '2') or "L" (treating it as '12'). Both are valid decodings, so the answer is 2.

**Important considerations:**
- A single digit can represent a letter if it's between 1-9 (note: '0' alone is not valid)
- Two consecutive digits can represent a letter if they form a number between 10-26
- Leading zeros make a string invalid (e.g., "06" cannot be decoded)
- A '0' can only appear as part of "10" or "20" (representing 'J' or 'T')
- The string may contain multiple zeros, which could make it impossible to decode

**Decoding examples:**
```
"226" can be decoded as:
- "BZ" → 2, 26
- "VF" → 22, 6
- "BBF" → 2, 2, 6
Total: 3 ways

"06" cannot be decoded:
- "06" is invalid (leading zero)
- "0" alone is invalid
- "6" alone doesn't account for the leading zero
Total: 0 ways
```

## Why This Matters

This problem is a classic dynamic programming challenge that models real-world encoding scenarios like message decryption, signal processing, and data compression. The pattern of "counting ways to partition a string with constraints" appears in many domains: parsing ambiguous grammars, RNA sequence folding in bioinformatics, and financial modeling of decision trees. Learning to solve this problem teaches you to recognize overlapping subproblems and build solutions incrementally—the core principles of dynamic programming that apply to hundreds of optimization problems in software engineering.

## Examples

**Example 1:**
- Input: `s = "12"`
- Output: `2`
- Explanation: "12" could be decoded as "AB" (1 2) or "L" (12).

**Example 2:**
- Input: `s = "226"`
- Output: `3`
- Explanation: "226" could be decoded as "BZ" (2 26), "VF" (22 6), or "BBF" (2 2 6).

**Example 3:**
- Input: `s = "06"`
- Output: `0`
- Explanation: "06" cannot be mapped to "F" because of the leading zero ("6" is different from "06").

## Constraints

- 1 <= s.length <= 100
- s contains only digits and may contain leading zero(s).

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Decision at Each Position</summary>

At each position in the string, you have a choice: decode the current digit alone (if valid) or decode it together with the previous digit (if that forms a valid number 10-26).

What edge cases make a decoding invalid? Think about '0' and numbers > 26.

</details>

<details>
<summary>🎯 Hint 2: Dynamic Programming Pattern</summary>

This is similar to the "climbing stairs" problem. At position i, the number of ways to decode depends on:
- Ways to decode up to position i-1 (if current digit is valid alone)
- Ways to decode up to position i-2 (if last two digits form valid 10-26)

Define `dp[i]` = number of ways to decode the substring s[0...i-1].

</details>

<details>
<summary>📝 Hint 3: DP Algorithm with Edge Cases</summary>

```
dp[0] = 1  # Empty string has one way
dp[1] = 0 if s[0] == '0' else 1

for i from 2 to len(s) + 1:
    # Single digit decode
    if s[i-1] != '0':
        dp[i] += dp[i-1]

    # Two digit decode
    two_digit = int(s[i-2:i])
    if 10 <= two_digit <= 26:
        dp[i] += dp[i-2]

return dp[len(s)]
```

Key edge cases:
- Leading zeros: "06" is invalid
- Middle zeros: "10" is valid (only as "J"), "30" is invalid
- Numbers > 26: "27" can only be decoded as "2" "7"

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Recursive (brute force) | O(2^n) | O(n) | Try all combinations, exponential |
| Recursive + Memoization | O(n) | O(n) | Cache subproblem results |
| **Dynamic Programming** | **O(n)** | **O(n)** | **Bottom-up table** |
| DP Space Optimized | O(n) | O(1) | Only track last two values |

## Common Mistakes

### 1. Not Handling Leading Zeros
```python
# WRONG: Doesn't check for leading zero
def numDecodings(s):
    if not s:
        return 0
    dp = [0] * (len(s) + 1)
    dp[0] = 1
    dp[1] = 1  # Should be 0 if s[0] == '0'

# CORRECT: Handle leading zero
def numDecodings(s):
    if not s or s[0] == '0':
        return 0
    dp = [0] * (len(s) + 1)
    dp[0] = 1
    dp[1] = 1
```

### 2. Incorrect Two-Digit Range Check
```python
# WRONG: Allows invalid two-digit codes
def numDecodings(s):
    # ...
    if s[i-2] != '0':  # Not enough!
        dp[i] += dp[i-2]

# CORRECT: Check valid range 10-26
def numDecodings(s):
    # ...
    two_digit = int(s[i-2:i])
    if 10 <= two_digit <= 26:
        dp[i] += dp[i-2]
```

### 3. Forgetting Middle Zeros
```python
# WRONG: Only adds one-digit decode
def numDecodings(s):
    for i in range(2, len(s) + 1):
        dp[i] = dp[i-1]  # What if s[i-1] is '0'?

# CORRECT: Check if single digit is valid
def numDecodings(s):
    for i in range(2, len(s) + 1):
        if s[i-1] != '0':
            dp[i] += dp[i-1]
        # ... also check two-digit ...
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Decode Ways II | Include '*' wildcard (1-9) | Multiply ways by 9 for '*', handle combinations |
| Minimum decode operations | Find minimum splits to decode | Similar DP, minimize instead of count |
| All decoded strings | Return actual decoded strings | Backtrack to build strings, not just count |
| Variable alphabet | Different encoding scheme | Adjust valid range checks |
| Decode with cost | Each decoding has a cost | Add cost tracking to DP state |

## Practice Checklist

**Correctness:**
- [ ] Handles strings starting with '0'
- [ ] Handles strings with middle '0's
- [ ] Correctly validates two-digit codes (10-26)
- [ ] Handles strings with no valid decodings
- [ ] Returns correct count for all examples

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 12 minutes
- [ ] Can discuss time/space complexity
- [ ] Can explain DP state transitions
- [ ] Can optimize space to O(1)

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
