---
id: E258
old_id: A409
slug: di-string-match
title: DI String Match
difficulty: easy
category: easy
topics: ["string", "greedy"]
patterns: ["greedy", "two-pointers"]
estimated_time_minutes: 15
frequency: low
related_problems: ["E031", "M060", "M077"]
prerequisites: ["arrays", "greedy-algorithms"]
strategy_ref: ../strategies/patterns/greedy.md
---
# DI String Match

## Problem

Imagine you have a permutation - a rearrangement of numbers from 0 to n where each number appears exactly once. Now, suppose someone encodes this permutation into a pattern string using only two characters: 'I' for "increasing" and 'D' for "decreasing". The encoding works like this: if the character at position i is 'I', it means the number at position i is less than the number at position i+1. If it's 'D', the number at position i is greater than the number at position i+1.

For example, the permutation `[0, 4, 1, 3, 2]` would be encoded as "IDID" because 0 < 4 (I), 4 > 1 (D), 1 < 3 (I), and 3 > 2 (D).

Your task is to reverse this process. Given just the pattern string `s` of length `n`, reconstruct any valid permutation of numbers 0 through n that matches this pattern. The key insight here is that a pattern of length n describes a permutation of n+1 numbers. Note that multiple valid permutations might exist for the same pattern, and you can return any one of them.

## Why This Matters

This problem teaches you to recognize when a greedy strategy works optimally. Instead of trying all possible permutations (which would be extremely slow), you can make locally optimal choices at each step that guarantee a globally valid solution. This greedy approach appears frequently in scheduling algorithms, resource allocation systems, and encoding schemes. The pattern also introduces the concept of using extremes strategically - choosing the smallest or largest available values based on constraints - which is a technique used in interval merging, task scheduling, and compression algorithms. Understanding when greedy choices work (and when they don't) is a fundamental skill for algorithm design interviews.

## Examples

**Example 1:**
- Input: `s = "IDID"`
- Output: `[0,4,1,3,2]`

**Example 2:**
- Input: `s = "III"`
- Output: `[0,1,2,3]`

**Example 3:**
- Input: `s = "DDI"`
- Output: `[3,2,0,1]`

## Constraints

- 1 <= s.length <= 10⁵
- s[i] is either 'I' or 'D'.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1: Conceptual Foundation
- For 'I' (increase), you want the current value to be as small as possible
- For 'D' (decrease), you want the current value to be as large as possible
- This suggests a greedy strategy: use extremes from available range
- You have n+1 positions to fill with numbers 0 to n

### Tier 2: Step-by-Step Strategy
- Maintain two pointers: `low = 0` and `high = n`
- Iterate through the pattern string character by character
- When you see 'I', use the smallest available number (low), then increment low
- When you see 'D', use the largest available number (high), then decrement high
- After processing all characters, add the remaining number (low == high)
- The greedy choice at each step guarantees a valid permutation

### Tier 3: Implementation Details
- Initialize `result = []`, `low = 0`, `high = len(s)`
- For each character `c` in string `s`:
  - If `c == 'I'`: append `low` to result, increment `low`
  - If `c == 'D'`: append `high` to result, decrement `high`
- After loop, append the final value (either `low` or `high`, they're equal)
- Return result array

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Greedy (Two Pointers) | O(n) | O(n) | Optimal solution, single pass |
| Backtracking (Try All Permutations) | O(n! * n) | O(n) | Extremely inefficient, explores all permutations |
| Stack-Based Construction | O(n) | O(n) | Alternative linear solution |

**Optimal Solution**: Greedy approach with two pointers achieves O(n) time complexity.

## Common Mistakes

### Mistake 1: Overcomplicating with permutation generation
```python
# Wrong: generating all permutations
from itertools import permutations
def diStringMatch(s):
    n = len(s)
    for perm in permutations(range(n + 1)):  # O(n!)
        if is_valid(perm, s):
            return list(perm)

# Correct: greedy approach
def diStringMatch(s):
    low, high = 0, len(s)
    result = []
    for c in s:
        if c == 'I':
            result.append(low)
            low += 1
        else:
            result.append(high)
            high -= 1
    result.append(low)  # or high, they're equal
    return result
```

### Mistake 2: Forgetting the last element
```python
# Wrong: only processing len(s) elements
result = []
for c in s:
    # ... add elements
return result  # Missing one element! Need n+1 elements for length n string

# Correct: add final element
result.append(low)  # After loop, add the remaining number
return result
```

### Mistake 3: Not maintaining valid range
```python
# Wrong: using same value twice
if c == 'I':
    result.append(low)
    # Forgot to increment low!

# Correct: update pointers after use
if c == 'I':
    result.append(low)
    low += 1
else:
    result.append(high)
    high -= 1
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Count valid permutations | Medium | Count all valid solutions instead of finding one |
| Lexicographically smallest permutation | Easy | Always prefer smaller values when possible |
| With additional constraints (sum, range) | Medium | Add constraints on permutation properties |
| Reconstruct pattern from permutation | Easy | Reverse operation - given perm, find pattern |
| K-ary increase/decrease (not just binary) | Medium | Multiple levels of increase/decrease |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Solved independently on first attempt
- [ ] Completed within 15 minutes
- [ ] Recognized greedy strategy immediately
- [ ] Used two-pointer technique correctly
- [ ] Remembered to include the final element
- [ ] Wrote bug-free code on first submission
- [ ] Explained solution clearly to someone else
- [ ] Solved without hints after 1 day
- [ ] Solved without hints after 1 week
- [ ] Identified time and space complexity correctly

**Spaced Repetition Schedule**: Review on Day 1, Day 3, Day 7, Day 14, Day 30

**Strategy**: See [Greedy Algorithms](../strategies/patterns/greedy.md)
