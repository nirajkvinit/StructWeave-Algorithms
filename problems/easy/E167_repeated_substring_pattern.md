---
id: E167
old_id: I258
slug: repeated-substring-pattern
title: Repeated Substring Pattern
difficulty: easy
category: easy
topics: ["string", "pattern-matching"]
patterns: ["string-manipulation", "kmp-algorithm"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E028", "E459", "E686"]
prerequisites: ["string-basics", "modulo-arithmetic", "divisors"]
strategy_ref: ../strategies/patterns/string-manipulation.md
---
# Repeated Substring Pattern

## Problem

Given a string `s`, determine whether it can be constructed by taking a shorter substring and repeating it multiple times (at least twice) to form the entire string. In other words, is there some pattern within the string that, when repeated consecutively, recreates the full string exactly?

For example, "abcabcabc" can be formed by repeating "abc" three times, so it matches the criteria. Similarly, "abab" is formed by repeating "ab" twice. However, "abcabd" cannot be formed by repeating any substring, so it doesn't match. Note that the pattern must repeat at least twice—a string that only appears once doesn't count.

The key insight is recognizing that if a string is formed by repeating a pattern, the pattern's length must be a divisor of the total string length. For instance, a string of length 12 could only be formed by repeating patterns of length 1, 2, 3, 4, or 6 (not 5, 7, 8, etc.). This mathematical constraint immediately eliminates most potential pattern lengths. There's also an elegant mathematical trick involving string concatenation that can solve this in a single line of code—can you figure it out?

## Why This Matters

Pattern detection in strings is fundamental to data compression, where identifying repeated sequences allows for more efficient encoding. This specific problem relates to concepts in formal language theory and automata, particularly in detecting periodic strings. In practical applications, this pattern appears in genomics (detecting tandem repeats in DNA sequences), music analysis (identifying repeated musical phrases), and log file analysis (detecting recurring patterns that might indicate issues).

The mathematical properties you'll explore here—particularly the relationship between divisors and valid pattern lengths—demonstrate how number theory intersects with string algorithms. The string concatenation trick for solving this problem is an example of elegant mathematical reasoning that can simplify seemingly complex pattern matching into a simple substring search. Understanding these approaches builds intuition for recognizing when mathematical insights can replace brute-force checking.

## Examples

**Example 1:**
- Input: `s = "abab"`
- Output: `true`
- Explanation: The pattern "ab" repeats two times to form the complete string.

**Example 2:**
- Input: `s = "aba"`
- Output: `false`

**Example 3:**
- Input: `s = "abcabcabcabc"`
- Output: `true`
- Explanation: This string can be viewed as "abc" repeated four times, or alternatively "abcabc" repeated twice.

## Constraints

- 1 <= s.length <= 10⁴
- s consists of lowercase English letters.

## Think About

1. What makes this problem challenging?
   - Identifying all possible pattern lengths to check
   - Efficiently verifying if a pattern repeats throughout the string
   - Handling edge cases like single character or patterns of varying lengths

2. Can you identify subproblems?
   - Finding all valid pattern lengths (divisors of string length)
   - Extracting a substring of given length
   - Checking if repeating that substring recreates the original string

3. What invariants must be maintained?
   - Pattern length must divide the string length evenly
   - The pattern must repeat at least twice
   - Each repetition must match exactly

4. Is there a mathematical relationship to exploit?
   - If s is composed of repeated pattern p, then s+s contains s as a substring starting at position len(p)
   - Pattern length must be a divisor of total string length
   - Only need to check pattern lengths up to len(s)/2

## Approach Hints

### Hint 1: Brute Force - Try All Pattern Lengths
Try every possible pattern length from 1 to n/2 (where n is string length). For each length, extract the substring from position 0 to length, then check if repeating it creates the original string.

**Key insight**: The pattern length must divide the string length evenly.

**Limitations**: Time complexity O(n²) because for each potential pattern length, you construct and compare strings.

### Hint 2: Optimized Pattern Checking
Instead of constructing the repeated string, check if each segment of the original string matches the first segment. Only check pattern lengths that are divisors of the string length.

**Key insight**: You can verify in-place by comparing characters at positions i and i % patternLen.

**How to implement**:
- Iterate through divisors of string length only
- For each divisor d, check if s[i] == s[i % d] for all i
- Return true on first valid pattern found

### Hint 3: String Concatenation Trick
Use a clever mathematical property: if string s is made of repeated pattern, then s will appear in (s+s) at a position other than 0. Remove the first and last character from (s+s) and search for s within it.

**Key insight**: If s = "abc" + "abc", then (s+s) = "abcabcabcabc", and s appears at index 3.

**Optimization strategy**:
- Create doubleStr = s + s
- Remove first and last character: doubleStr[1:-1]
- Check if s is substring of doubleStr[1:-1]
- Time: O(n) with KMP, Space: O(n)

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (All lengths) | O(n²) | O(n) | Check n/2 patterns, each requires O(n) string construction |
| Check Divisors Only | O(n·d(n)) | O(1) | d(n) is number of divisors, typically O(√n) for most inputs |
| Optimized In-place Check | O(n√n) | O(1) | Check only divisor lengths, verify in O(n) per divisor |
| String Concatenation Trick | O(n²) or O(n) | O(n) | O(n²) with naive search, O(n) with KMP algorithm |

## Common Mistakes

### Mistake 1: Not checking if pattern length divides string length
```
// Wrong - tries all lengths without checking divisibility
for (let len = 1; len <= s.length / 2; len++) {
    pattern = s.substring(0, len)
    // ... check if pattern repeats
}

// Why it fails: If s.length = 10 and len = 3, pattern can't repeat evenly
// "abcabcabca" cannot be formed by repeating 3-char pattern

// Correct - only check valid divisors
for (let len = 1; len <= s.length / 2; len++) {
    if (s.length % len !== 0) continue
    // ... check if pattern repeats
}
```

### Mistake 2: Inefficient string construction for verification
```
// Wrong - creates new string for each check
pattern = s.substring(0, len)
repeated = pattern.repeat(s.length / len)
if (repeated === s) return true

// Why it's inefficient: O(n) space and time for each pattern length
// With many divisors, this becomes wasteful

// Correct - verify in-place
isValid = true
for (let i = len; i < s.length; i++) {
    if (s[i] !== s[i % len]) {
        isValid = false
        break
    }
}
```

### Mistake 3: Incorrect implementation of concatenation trick
```
// Wrong - includes original positions
doubleStr = s + s
if (doubleStr.includes(s)) return true

// Why it fails: s+s always contains s at position 0 and position s.length
// Example: s = "abc", s+s = "abcabc", contains "abc" at index 0

// Correct - exclude first and last characters
doubleStr = s + s
return doubleStr.substring(1, doubleStr.length - 1).includes(s)
```

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Find the shortest repeating pattern | Return the pattern itself, not just boolean | Easy |
| Count all valid patterns | Count how many different patterns can form the string | Medium |
| Maximum pattern length | Find the longest repeating pattern in the string | Medium |
| K-repeated pattern | Check if string is formed by repeating pattern exactly k times | Medium |
| Multiple patterns | Allow string to be composed of alternating patterns | Hard |
| Approximate pattern matching | Allow small differences between repetitions | Hard |

## Practice Checklist

Track your progress on mastering this problem:

- [ ] First attempt (understand the problem)
- [ ] Implement brute force solution
- [ ] Optimize to check only divisors
- [ ] Implement concatenation trick approach
- [ ] Handle edge cases (single char, no pattern, full string as pattern)
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Solve without hints
- [ ] Explain solution to someone else
- [ ] Complete in under 15 minutes

**Strategy**: See [String Manipulation Pattern](../strategies/patterns/string-manipulation.md)
