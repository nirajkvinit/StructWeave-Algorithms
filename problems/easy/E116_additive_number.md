---
id: E116
old_id: I105
slug: additive-number
title: Additive Number
difficulty: easy
category: easy
topics: ["string"]
patterns: ["backtracking", "recursion"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E119", "E118", "M020"]
prerequisites: ["string-manipulation", "recursion", "number-validation"]
strategy_ref: ../strategies/patterns/backtracking.md
---
# Additive Number

## Problem

An additive number is a string of digits that can be partitioned into a sequence of at least three numbers where each number (starting from the third) equals the sum of the two preceding numbers. Think of it like the Fibonacci sequence: once you choose the first two numbers, the rest of the sequence is completely determined.

Given a string containing only digits, determine whether it can be split into an additive sequence. Return `true` if such a partition exists, `false` otherwise.

Here's a concrete example: the string "112358" can be split into [1, 1, 2, 3, 5, 8] because 1+1=2, 1+2=3, 2+3=5, and 3+5=8. Each subsequent number is the sum of its two predecessors. Similarly, "199100199" splits into [1, 99, 100, 199] because 1+99=100 and 99+100=199.

A critical constraint: numbers in the sequence cannot have leading zeros except for the number zero itself. This means "1, 2, 03" is invalid even though mathematically it works. This rule prevents ambiguous interpretations and mirrors real-world number formatting rules.

The key algorithmic insight is that choosing the lengths of the first two numbers determines everything else. You can try all possible ways to split the string into a first number (from 1 to roughly n/2 characters) and a second number (from 1 to roughly (n-first_length)/2 characters), then validate whether the rest of the string follows the additive pattern. Since the string can have up to 35 digits, numbers can exceed normal integer ranges, requiring string arithmetic or careful overflow handling.

## Why This Matters

This problem teaches backtracking with constraint propagation, a powerful technique in artificial intelligence and constraint satisfaction problems. The idea that early choices determine all future states appears in SAT solvers, sudoku solvers, and planning algorithms.

Validating sequences with arithmetic properties is common in financial fraud detection (detecting suspicious transaction patterns), scientific data validation (verifying sensor readings follow expected formulas), and quality control systems (checking manufacturing tolerances).

The technique of using string arithmetic to avoid integer overflow is crucial for competitive programming and systems handling large numbers like cryptography, arbitrary-precision mathematics libraries, and financial systems dealing with very large monetary values.

This problem also demonstrates the importance of early termination and pruning in search algorithms. Once you detect that a chosen first number leads to a mismatch, you can immediately backtrack without exploring further, dramatically reducing the search space.

## Examples

**Example 1:**
- Input: `"112358"`
- Output: `true`
- Explanation: Valid partition creates the sequence: 1, 1, 2, 3, 5, 8.
Each number after the first two satisfies the addition property: 1 + 1 = 2, 1 + 2 = 3, 2 + 3 = 5, 3 + 5 = 8

**Example 2:**
- Input: `"199100199"`
- Output: `true`
- Explanation: Valid partition yields: 1, 99, 100, 199.
Verification: 1 + 99 = 100, 99 + 100 = 199

## Constraints

- 1 <= num.length <= 35
- num consists only of digits.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Hint 1: Intuition (Beginner)
Think about how you would verify if a number sequence is additive by hand. Once you pick the first two numbers, what can you determine about the rest? The key insight is that the first two numbers completely determine the entire sequence. Consider trying different lengths for the first two numbers systematically.

### Hint 2: Optimization (Intermediate)
Once you commit to the lengths of the first two numbers, you can extract them from the string and generate what the third number should be. Then check if that third number actually appears in the string at the expected position. Continue this validation process. Remember to handle leading zeros and use string manipulation for large numbers.

### Hint 3: Implementation Details (Advanced)
Use backtracking with early termination. Try all possible splits for the first number (1 to n/2 characters), then all possible splits for the second number. For each pair, validate the sequence by generating expected sums and comparing with actual substrings. Use string addition to avoid integer overflow. Prune invalid branches immediately when you detect leading zeros or mismatches.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Backtracking with validation | O(n^2 * n) = O(n^3) | O(n) | First two numbers: O(n^2) combinations, validation: O(n) per combination |
| Optimized backtracking | O(n^2 * log(max_num)) | O(log(max_num)) | String addition for large numbers, early pruning |
| Brute force enumeration | O(2^n * n) | O(n) | Generate all partitions, too slow |

## Common Mistakes

### Mistake 1: Integer Overflow
```python
# Wrong: Using integers can overflow for large numbers
def isAdditiveNumber(num):
    first = int(num[0:5])
    second = int(num[5:10])
    third = first + second  # Can overflow!
```
**Fix:** Use string addition or handle numbers as strings to avoid overflow issues.

### Mistake 2: Not Handling Leading Zeros
```python
# Wrong: Accepting numbers with leading zeros
def isValid(s):
    return True  # Always accepts "01", "02", etc.
```
**Fix:** Reject any number string that starts with '0' except for the string "0" itself.

### Mistake 3: Inefficient String Comparison
```python
# Wrong: Building the entire sequence before checking
def isAdditiveNumber(num):
    sequence = []
    # Build entire sequence first
    for i in range(len(num)):
        sequence.append(get_next())
    return validate_all(sequence)  # Too late to fail fast
```
**Fix:** Validate as you go, failing early when a mismatch is detected.

## Variations

| Variation | Description | Difficulty | Key Difference |
|-----------|-------------|------------|----------------|
| Multiplicative Number | Numbers multiply instead of add | Medium | Use multiplication, handle growth rates |
| Fibonacci Validation | Check if sequence matches Fibonacci | Easy | Pre-generate Fibonacci numbers |
| K-Number Sequence | Generalize to K starting numbers | Hard | Track K variables, more combinations |
| String Pattern Matching | Find repeating additive patterns | Medium | Pattern detection, multiple sequences |

## Practice Checklist

Study Plan:
- [ ] Day 1: Understand backtracking concept, write brute force solution
- [ ] Day 3: Optimize with early termination, handle edge cases
- [ ] Day 7: Implement string addition, solve without hints
- [ ] Day 14: Solve variations, teach concept to someone
- [ ] Day 30: Speed solve (< 15 minutes), verify all edge cases

Key Mastery Indicators:
- Can explain why first two numbers determine the sequence
- Handle leading zeros correctly without bugs
- Implement efficient string addition for large numbers
- Optimize with early pruning techniques

**Strategy**: See [Backtracking](../strategies/patterns/backtracking.md)
