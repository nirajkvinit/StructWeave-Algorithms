---
id: E214
old_id: A145
slug: valid-parenthesis-string
title: Valid Parenthesis String
difficulty: easy
category: easy
topics: ["string", "dynamic-programming", "greedy", "stack"]
patterns: ["greedy", "range-tracking"]
estimated_time_minutes: 15
frequency: medium
prerequisites: ["stack", "greedy-algorithms", "valid-parentheses"]
related_problems: ["E020", "M678", "M1249"]
strategy_ref: ../strategies/patterns/greedy.md
---
# Valid Parenthesis String

## Problem

You're given a string containing only three types of characters: opening parentheses '(', closing parentheses ')', and wildcards '*'. Your task is to determine if the string can form a valid parentheses expression. The wildcard '*' adds complexity - it can represent either an opening parenthesis '(', a closing parenthesis ')', or be treated as an empty string (effectively ignored).

A valid parentheses string follows these rules: (1) every opening '(' must have a matching closing ')', (2) every closing ')' must have a corresponding opening '(' that came before it, and (3) at no point while reading left-to-right should the count of closing ')' exceed opening '(' (you can't match a ')' to a '(' that doesn't exist yet).

For example, "()" is valid, "(*)" is valid (the * can be treated as ')', "(*))" is also valid (one * becomes '(' and the other becomes empty string). But "(()" is invalid (unmatched opening), and "())" is invalid (unmatched closing).

The challenge is that wildcards create ambiguity - you need to determine if there exists some assignment of wildcards that makes the string valid, not whether all assignments work. This is trickier than the classic valid parentheses problem (E020) where you simply use a stack.

## Why This Matters

This problem appears in parsing and validation systems where you need to handle flexible or incomplete input. In code editors, syntax highlighting must handle partially-typed expressions. In natural language processing, you might match brackets in text that contains unknown elements. In compiler design, error recovery often involves treating ambiguous characters as different tokens to find valid interpretations. The problem teaches you greedy algorithms with uncertainty - instead of tracking exact state, you track a range of possible states. This "range tracking" technique appears in interval scheduling, resource allocation, and constraint satisfaction problems. It also demonstrates that sometimes the optimal solution isn't the obvious one - while you might think to use dynamic programming or recursion, a clever two-variable greedy approach solves it in O(n) time with O(1) space. Many interview questions test whether you can find such elegant solutions.

## Examples

**Example 1:**
- Input: `s = "()"`
- Output: `true`

**Example 2:**
- Input: `s = "(*)"`
- Output: `true`

**Example 3:**
- Input: `s = "(*))"`
- Output: `true`

## Constraints

- 1 <= s.length <= 100
- s[i] is '(', ')' or '*'.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Track Range of Possibilities (Greedy)
Instead of tracking exact balance, maintain a range [low, high] representing the minimum and maximum possible number of unmatched open parentheses. For '(', increment both; for ')', decrement both; for '*', decrement low (treat as ')') and increment high (treat as '('). If high goes negative, it's impossible. At the end, check if low <= 0 (can we balance everything?).

### Hint 2: Two-Pass Validation
First pass (left to right): treat '*' as '(' when needed to match ')'. Track open count; never let it go negative. Second pass (right to left): treat '*' as ')' when needed to match '('. Track close count; never let it go negative. Valid if both passes succeed. This ensures wildcards can be placed appropriately.

### Hint 3: Dynamic Programming Approach
Use DP where dp[i][j] represents whether substring s[i:j] is valid. A substring is valid if: it's empty, it matches a pair like (substring), or it can be split into two valid parts. Handle '*' by trying all three options. This is O(n³) but works for understanding.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Greedy Range Tracking | O(n) | O(1) | Optimal solution |
| Two-Pass Greedy | O(n) | O(1) | Alternative greedy approach |
| Dynamic Programming | O(n³) | O(n²) | Works but slower |
| Recursion with Memoization | O(n²) | O(n²) | Better DP approach |
| Stack with Wildcards | O(n) | O(n) | Uses stacks for tracking |

## Common Mistakes

### Mistake 1: Not handling low bound going negative
```
// Wrong: Allowing low to become negative
for (char c : s.toCharArray()) {
    if (c == '(') { low++; high++; }
    else if (c == ')') { low--; high--; }  // low can go negative!
    else { low--; high++; }
    if (high < 0) return false;
}
return low == 0;  // Wrong final check
```
**Why it's wrong**: Low should never be negative (represents minimum opens). When it would go negative, clamp it to 0. Also, final check should be `low <= 0`, not `low == 0`.

**Correct approach**: Use `low = Math.max(0, low)` after updates, and check `low <= 0` at end.

### Mistake 2: Incorrect final validation
```
// Wrong: Requiring exact balance
return low == 0 && high >= 0;  // Too strict!
```
**Why it's wrong**: We need to check if it's possible to balance, which means 0 should be within the range [low, high], i.e., `low <= 0 <= high`.

**Correct approach**: Return `low <= 0` (since we already checked high >= 0 during iteration).

### Mistake 3: Two-pass approach with wrong logic
```
// Wrong: Not properly tracking both directions
// First pass
int balance = 0;
for (char c : s) {
    if (c == '(' || c == '*') balance++;
    else balance--;
    if (balance < 0) return false;
}
// Missing second pass!
return balance == 0;  // Not sufficient
```
**Why it's wrong**: Left-to-right pass alone isn't enough. Need right-to-left pass too to ensure no unmatched '(' remain when treating '*' optimally.

**Correct approach**: Perform both left-to-right and right-to-left passes.

## Variations

| Variation | Difference | Difficulty Increase |
|-----------|------------|---------------------|
| Basic valid parentheses (E020) | No wildcards | None (easier, classic stack) |
| Minimum additions to make valid | Return count of additions needed | Medium (similar logic) |
| Remove invalid parentheses | Return all valid strings | Hard (backtracking) |
| Valid parentheses with multiple types | (), {}, [] with wildcards | Medium (stack with types) |
| Longest valid parentheses | Find longest valid substring | Hard (DP or stack) |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Solve using range tracking greedy
- [ ] Implement two-pass approach
- [ ] Understand DP solution
- [ ] Handle edge cases ("", "*", "()", "(*)")
- [ ] Implement without bugs on first try
- [ ] Explain why greedy works
- [ ] Test with "()", "(*)", "(*)))"
- [ ] Solve in under 20 minutes
- [ ] Compare all approaches
- [ ] Revisit after 3 days (spaced repetition)
- [ ] Revisit after 1 week (spaced repetition)
- [ ] Solve basic valid parentheses first (E020)

**Strategy**: See [Greedy Algorithms](../strategies/patterns/greedy.md)
