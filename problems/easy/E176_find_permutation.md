---
id: E176
old_id: I283
slug: find-permutation
title: Find Permutation
difficulty: easy
category: easy
topics: ["string"]
patterns: ["backtrack-permutation"]
estimated_time_minutes: 15
frequency: medium
related_problems:
  - E001  # Two Sum
  - M020  # Permutation Sequence
  - M008  # Next Permutation
prerequisites:
  - Array traversal
  - Greedy algorithms
  - String manipulation
strategy_ref: ../strategies/patterns/greedy.md
---
# Find Permutation

## Problem

You're given a pattern string that encodes information about a permutation of numbers from 1 to n. The pattern uses two characters: 'I' for "increasing" and 'D' for "decreasing". Each character describes the relationship between adjacent numbers in the permutation.

Specifically, if the pattern has 'I' at position i, it means the number at position i is less than the number at position i+1. Similarly, 'D' at position i means the number at position i is greater than the number at position i+1. For example, the pattern "DI" describes a permutation where the first number is greater than the second, and the second is less than the third.

Your task is to find the lexicographically smallest permutation that matches this pattern. Lexicographically smallest means if you were to list all valid permutations alphabetically (treating the array of numbers like a word), you want the first one. For instance, [1,3,2] comes before [2,1,3] lexicographically because 1 < 2 at the first position.

The key insight: a string of length n-1 describes a permutation of n numbers, because n-1 comparisons are needed to relate n adjacent pairs.

## Why This Matters

This problem teaches greedy algorithm design and stack-based construction techniques that appear frequently in parsing, compiler design, and sequence optimization problems. The core pattern - using a stack to defer decisions until you have complete information - is fundamental to many algorithms including expression evaluation, balanced parentheses checking, and monotonic stack problems. The lexicographic minimization constraint teaches you to think about making locally optimal choices (using the smallest available number) while respecting global constraints (the I/D pattern). This type of constrained optimization appears in scheduling problems, resource allocation, and anywhere you need to construct an optimal sequence under specific rules.

## Examples

**Example 1:**
- Input: `s = "I"`
- Output: `[1,2]`
- Explanation: The sequence [1,2] is the sole valid permutation for this pattern, showing an increase between positions 0 and 1.

**Example 2:**
- Input: `s = "DI"`
- Output: `[2,1,3]`
- Explanation: Multiple permutations match "DI", including [2,1,3] and [3,1,2], but [2,1,3] is the lexicographically smallest.

## Constraints

- 1 <= s.length <= 10⁵
- s[i] is either 'I' or 'D'.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Hint
Start by thinking about what makes a permutation lexicographically smallest. Consider using a stack to track pending decreasing sequences. When you encounter 'D', delay assigning numbers; when you see 'I', assign accumulated numbers in reverse.

### Intermediate Hint
Use a greedy approach with a stack. Process the string character by character, pushing indices onto a stack for each 'D', and popping to assign numbers for each 'I'. This ensures you use the smallest available numbers for each position while respecting the I/D constraints.

### Advanced Hint
Recognize this as a greedy construction problem. Maintain a stack and process positions 0 to n. For 'D' characters, accumulate positions on the stack. At each 'I' or at the end, pop all stack elements and assign numbers in increasing order (current number, number+1, etc.). This guarantees lexicographic minimality.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (Generate All) | O(n! * n) | O(n!) | Generate all permutations, validate each |
| Stack-based Greedy | O(n) | O(n) | Single pass with stack for pending positions |
| Two-pointer Greedy | O(n) | O(n) | Track ranges of D's, assign in reverse |
| Optimal (In-place Stack) | O(n) | O(n) | Result array serves as output |

## Common Mistakes

### Mistake 1: Not handling the last character properly
```python
# Wrong: Forgetting to flush the stack at the end
def findPermutation(s):
    stack, result = [], []
    for i, c in enumerate(s):
        stack.append(i + 1)
        if c == 'I':
            while stack:
                result.append(stack.pop())
    # Missing: need to append remaining stack elements
    return result
```

**Issue**: After processing all characters, remaining elements in the stack must be popped and added to result.

**Fix**: Always flush the stack after the loop completes.

### Mistake 2: Incorrect index management
```python
# Wrong: Off-by-one error in assigning numbers
def findPermutation(s):
    n = len(s)
    result = [0] * n  # Should be n+1
    # ... rest of logic
```

**Issue**: A string of length n represents n+1 positions in the permutation (positions between n+1 numbers).

**Fix**: Ensure result array has length n+1, not n.

### Mistake 3: Not processing characters in proper order
```python
# Wrong: Processing D's differently from I's
def findPermutation(s):
    result = []
    for i, c in enumerate(s):
        if c == 'D':
            result.append(i + 2)  # Assigning immediately
        else:
            result.append(i + 1)
    return result
```

**Issue**: Assigning numbers immediately without considering the sequence context fails to produce lexicographically smallest result.

**Fix**: Use a stack to defer assignment until you understand the full decreasing sequence.

## Variations

| Variation | Difficulty | Description |
|-----------|----------|-------------|
| Find Kth Permutation | Medium | Find the kth lexicographically smallest permutation matching the pattern |
| Count Valid Permutations | Medium | Count how many permutations match the given I/D pattern |
| Maximum Permutation | Easy | Find the lexicographically largest permutation instead of smallest |
| Two Patterns | Hard | Given two patterns, find permutation matching both or determine impossibility |
| Circular Permutation | Hard | Apply I/D pattern in a circular manner where last connects to first |

## Practice Checklist

Track your progress on this problem:

**First Attempt**
- [ ] Solved independently (30 min time limit)
- [ ] Implemented stack-based greedy solution
- [ ] All test cases passing
- [ ] Analyzed time and space complexity

**Spaced Repetition**
- [ ] Day 1: Resolve from memory
- [ ] Day 3: Solve with optimal approach
- [ ] Week 1: Implement without hints
- [ ] Week 2: Solve related variations
- [ ] Month 1: Teach solution to someone else

**Mastery Goals**
- [ ] Can explain why greedy approach works
- [ ] Can handle edge cases (all I's, all D's, single character)
- [ ] Can extend to find kth permutation
- [ ] Can solve in under 15 minutes

**Strategy**: See [Greedy Patterns](../strategies/patterns/greedy.md)
