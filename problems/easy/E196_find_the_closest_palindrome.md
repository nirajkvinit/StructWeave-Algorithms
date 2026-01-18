---
id: E196
old_id: A060
slug: find-the-closest-palindrome
title: Find the Closest Palindrome
difficulty: easy
category: easy
topics: ["string", "math"]
patterns: ["edge-case-analysis"]
estimated_time_minutes: 15
frequency: low
related_problems: ["E033", "M018", "M195"]
prerequisites: ["string-manipulation", "palindrome-basics", "edge-cases"]
strategy_ref: ../strategies/patterns/edge-case-analysis.md
---
# Find the Closest Palindrome

## Problem

Given a string representing a positive integer, find the closest palindromic integer that is different from the given number. If multiple palindromes are equally close, return the smaller one. Closeness is measured by the absolute difference between the integers.

The challenge lies in handling edge cases systematically rather than testing every nearby integer. Consider what happens with numbers like "99", "100", "1", or "9". When you're at a boundary (like 999 or 1000), the closest palindrome might require adding or removing digits entirely.

The key insight is that there are only a limited number of candidates to consider: mirroring the first half of the number, incrementing the middle and mirroring, decrementing the middle and mirroring, and the boundary cases 999...9 and 100...001. Rather than searching randomly, generate these specific candidates, compare their distances, and select the best one while excluding the original number itself.

Because the input can represent numbers up to 10^18, you'll need to work with strings for manipulation and only convert to integers when necessary for comparison arithmetic.

## Why This Matters

This problem develops your skill in edge case analysis and candidate generation, essential techniques for solving complex constraint problems without brute force. The pattern of identifying a small set of critical candidates appears in optimization problems, binary search implementations, and mathematical algorithms. Working with very large numbers as strings is crucial in financial applications, cryptography, and systems handling arbitrary-precision arithmetic. The systematic approach to boundary conditions translates to debugging production systems, designing test suites, and building robust validators. Companies working with numerical data, distributed systems, or API design value this kind of careful edge-case thinking. The problem also teaches you when exhaustive search is impractical and how to mathematically constrain the solution space.

## Examples

**Example 1:**
- Input: `n = "123"`
- Output: `"121"`

**Example 2:**
- Input: `n = "1"`
- Output: `"0"`
- Explanation: Both 0 and 2 are equidistant palindromes, so we select the smaller value, which is 0.

## Constraints

- 1 <= n.length <= 18
- n consists of only digits.
- n does not have leading zeros.
- n is representing an integer in the range [1, 10¹⁸ - 1].

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Understanding Edge Cases
Consider special cases that could break a simple palindrome construction:
- What happens with single-digit numbers?
- How do you handle numbers like "999" or "1000"?
- What about numbers that are already palindromes?

Think about the candidates: there are only a few possible closest palindromes to check.

### Hint 2: Candidate Generation Strategy
Generate a small set of candidate palindromes and choose the closest:
- Mirror the first half to create a palindrome
- Increment the middle digit(s) and mirror
- Decrement the middle digit(s) and mirror
- Consider boundary cases: 999...9 and 100...001

How do you handle incrementing/decrementing when digits reach 0 or 9?

### Hint 3: Optimal Comparison and Selection
Once you have all candidates:
- Calculate absolute differences from the original number
- Remember to exclude the original number itself
- When distances are equal, choose the smaller palindrome

Can you implement this using string manipulation for large numbers (up to 10^18)?

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Candidate Generation | O(n) | O(n) | n = number of digits; generate 5 candidates max |
| Brute Force | O(n × 10^k) | O(n) | k = number of digits to change; impractical for large n |

## Common Mistakes

### Mistake 1: Forgetting Edge Cases
```python
# Wrong: Doesn't handle single digits or boundary cases
def nearestPalindrome(n):
    half = n[:len(n)//2]
    return half + half[::-1]
```
**Why it's wrong:** Fails for "1" (should return "0"), "999" (should handle rollover), and odd-length strings.

**Correct approach:** Generate multiple candidates including edge cases like "99...9" and "100...001".

### Mistake 2: Including the Original Number
```python
# Wrong: May return the input if it's already a palindrome
def nearestPalindrome(n):
    candidates = [mirror(n)]  # If n is palindrome, returns n
    return min(candidates, key=lambda x: abs(int(x) - int(n)))
```
**Why it's wrong:** Problem requires finding a DIFFERENT palindrome, excluding n itself.

**Correct approach:** Filter out any candidate that equals the original number before comparison.

### Mistake 3: Integer Overflow with Large Numbers
```python
# Wrong: Converts to int before checking constraints
def nearestPalindrome(n):
    num = int(n)  # May overflow for very large numbers
    # ... rest of logic
```
**Why it's wrong:** Numbers can be up to 10^18, which exceeds many language integer limits.

**Correct approach:** Work with strings for all comparisons and transformations, only converting when necessary for arithmetic.

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Find k-th closest palindrome | Return the k-th nearest palindrome instead of the first | Medium |
| Palindrome in specific base | Find closest palindrome in base-b number system | Hard |
| Closest palindrome within range | Find nearest palindrome in range [L, R] | Medium |
| Multiple constraints | Closest palindrome with digit sum divisible by k | Hard |

## Practice Checklist

Practice this problem until you can confidently complete these tasks:

- [ ] Day 1: Solve with candidate generation approach (30 min)
- [ ] Day 3: Implement without looking at notes (20 min)
- [ ] Day 7: Handle all edge cases correctly (15 min)
- [ ] Day 14: Explain the approach to someone else
- [ ] Day 30: Solve a variation (closest palindrome in range)

**Strategy**: See [Edge Case Analysis](../strategies/patterns/edge-case-analysis.md)
