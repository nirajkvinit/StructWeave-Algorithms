---
id: E217
old_id: A153
slug: repeated-string-match
title: Repeated String Match
difficulty: easy
category: easy
topics: ["string", "string-matching"]
patterns: ["string-search", "pattern-matching"]
estimated_time_minutes: 15
frequency: medium
related_problems:
  - E028_find_index_of_first_occurrence
  - M686_repeated_substring_pattern
  - M796_rotate_string
prerequisites:
  - String concatenation
  - Substring search
  - Mathematical ceiling function
strategy_ref: ../strategies/patterns/string-matching.md
---
# Repeated String Match

## Problem

Given two strings `a` and `b`, you need to determine the minimum number of times you must repeat string `a` to create a new string that contains `b` as a substring. If it's impossible to make `b` appear in the repeated version of `a`, return `-1`.

Think of this like tiling: imagine you're repeating copies of `a` end-to-end, and you want to find out how many copies you need before `b` appears somewhere within that concatenated result. For example, if `a = "abc"` and you repeat it three times, you get `"abcabcabc"`. The challenge arises when `b` might start in the middle of one repetition and end in the middle of another, requiring careful calculation of the minimum needed copies.

An important edge case to consider upfront: if the characters in `b` aren't all present in `a`, no amount of repetition will help. Also, when `b` is longer than `a`, you'll definitely need multiple repetitions, but even when `b` is shorter, you might still need two copies if `b` spans across the boundary between two repetitions.

**Note:** Repeating a string `"abc"` zero times yields an empty string `""`, once gives `"abc"`, and twice produces `"abcabc"`.

## Why This Matters

This problem appears frequently in text processing systems where you need to detect patterns that wrap around or span multiple segments. Real-world applications include DNA sequence analysis (finding gene patterns that may span multiple read fragments), log file parsing (detecting events that might be split across log rotations), and data streaming (pattern matching in circular buffers).

The core algorithmic insight here is "binary search on answers" combined with efficient string matching. Rather than blindly trying every possible number of repetitions, you can mathematically determine the minimum and maximum bounds. This demonstrates how ceiling division and boundary analysis can dramatically reduce search space. The problem also connects to the Knuth-Morris-Pratt (KMP) pattern matching algorithm for those seeking optimization beyond the basic solution.

Interviewers favor this problem because it tests both mathematical reasoning (calculating minimum repetitions) and defensive programming (handling edge cases like same-character strings or impossible matches). It's a gateway to more complex string algorithms while remaining approachable.

## Examples

**Example 1:**
- Input: `a = "abcd", b = "cdabcdab"`
- Output: `3`
- Explanation: Concatenating `a` three times produces "abcdabcdabcd", which contains `b` as a substring.

**Example 2:**
- Input: `a = "a", b = "aa"`
- Output: `2`

## Constraints

- 1 <= a.length, b.length <= 10⁴
- a and b consist of lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1 Hint - Initial Direction
Think about the minimum and maximum number of repetitions needed. What's the minimum based on length alone? When should you stop trying additional repetitions?

### Tier 2 Hint - Key Insight
The minimum repetitions needed is at least `ceiling(len(b) / len(a))`. However, `b` might start in the middle of one repetition of `a` and end in the middle of another, so you might need one extra repetition. Test with `k = ceiling(len(b) / len(a))` repetitions, and if that doesn't work, try `k + 1`.

### Tier 3 Hint - Implementation Details
Calculate `k = (len(b) + len(a) - 1) // len(a)` (ceiling division). Build the repeated string `repeated = a * k` and check if `b in repeated`. If not found, try `repeated = a * (k + 1)`. If still not found, return -1.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Direct concatenation | O(k * m + n) | O(k * m) | k = repetitions, m = len(a), n = len(b) for substring search |
| Optimized with early stop | O((n/m) * m + n) | O(n + m) | Only try up to k+1 repetitions |
| KMP pattern matching | O(m + n) | O(n) | Using KMP for substring search |

**Optimization notes:**
- No need to try more than `ceiling(len(b)/len(a)) + 1` repetitions
- Can use efficient string matching algorithms (KMP, Rabin-Karp)
- Early termination if `b` contains characters not in `a`

## Common Mistakes

### Mistake 1: Testing too many repetitions
```python
# Wrong - inefficient, testing unlimited repetitions
repeated = ""
count = 0
while b not in repeated and count < 10000:
    repeated += a
    count += 1

# Correct - only test necessary repetitions
k = (len(b) + len(a) - 1) // len(a)
if b in a * k or b in a * (k + 1):
    return k if b in a * k else k + 1
return -1
```

### Mistake 2: Not handling edge cases
```python
# Wrong - doesn't handle when b is shorter than a
if len(b) < len(a):
    return -1  # Incorrect!

# Correct - b can be shorter
k = max(1, (len(b) + len(a) - 1) // len(a))
```

### Mistake 3: Incorrect length calculation
```python
# Wrong - using floor division
k = len(b) // len(a)

# Correct - using ceiling division
k = (len(b) + len(a) - 1) // len(a)
# or: k = math.ceil(len(b) / len(a))
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Maximum repetitions | Easy | Find maximum k where repeated string contains b at least once |
| Count occurrences | Medium | Return how many times b appears in the minimally repeated string |
| Circular string match | Medium | Check if b can be found by wrapping around a |
| Multiple pattern match | Hard | Given list of patterns, find min repetitions for all to appear |

## Practice Checklist

Track your progress on mastering this problem:

**Initial Practice**
- [ ] Solve independently without hints (30 min time limit)
- [ ] Calculate minimum repetitions correctly
- [ ] Handle case where b is shorter than a
- [ ] Test with patterns that span multiple repetitions

**Spaced Repetition**
- [ ] Day 1: Solve again from scratch
- [ ] Day 3: Optimize with early character set check
- [ ] Week 1: Implement with KMP algorithm
- [ ] Week 2: Solve circular string variation

**Mastery Validation**
- [ ] Can explain the k and k+1 repetition logic
- [ ] Can derive the ceiling division formula
- [ ] Solve in under 10 minutes
- [ ] Implement without referring to notes

**Strategy**: See [String Matching Pattern](../strategies/patterns/string-matching.md)
