---
id: E154
old_id: I219
slug: strong-password-checker
title: Strong Password Checker
difficulty: easy
category: easy
topics: ["string", "greedy"]
patterns: ["greedy", "string-validation", "state-tracking"]
estimated_time_minutes: 15
frequency: low
related_problems: ["E125", "E020", "M005"]
prerequisites: ["string-traversal", "character-classification", "greedy-optimization"]
strategy_ref: ../strategies/patterns/greedy.md
---
# Strong Password Checker

## Problem

Imagine you're building a password validation system for a website. A password is considered "strong" when it meets all three of these security requirements:

1. **Length**: Contains between 6 and 20 characters (inclusive)
2. **Character diversity**: Includes at least one lowercase letter, at least one uppercase letter, and at least one digit
3. **No repeating sequences**: Never has three or more identical characters in a row (for example, "B**aaa**bb0" violates this rule, while "B**aa**b**a**0" is acceptable)

Given a string `password`, your task is to calculate the minimum number of modifications needed to transform it into a strong password. If it already satisfies all requirements, return 0.

You can make three types of modifications:
- **Insert** a character anywhere in the password
- **Delete** a character from anywhere in the password
- **Replace** one character with a different character

The challenge is determining how to fix multiple violations simultaneously with the fewest total operations. For instance, replacing 'a' with 'A' in "aaa" both adds a missing uppercase letter and breaks up the repeating sequence, achieving two goals with one operation.

## Why This Matters

Password validation is a critical real-world security feature in virtually every application that handles user authentication. This problem teaches you how to optimize greedy decisions when operations can satisfy multiple constraints simultaneously, a pattern that appears in resource allocation, task scheduling, and configuration management systems. The technique of identifying overlapping requirements and choosing operations that fix multiple issues at once is fundamental to optimization problems in system design. Understanding how additions, deletions, and replacements interact differently based on length constraints is also key to building efficient validation logic that runs in O(n) time, even for complex rule sets.

## Examples

**Example 1:**
- Input: `password = "a"`
- Output: `5`

**Example 2:**
- Input: `password = "aA1"`
- Output: `3`

**Example 3:**
- Input: `password = "1337C0d3"`
- Output: `0`

## Constraints

- 1 <= password.length <= 50
- password consists of letters, digits, dot '.' or exclamation mark '!'.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Count Violations Separately
Analyze the password in one pass to identify three types of violations: (1) length issues (too short or too long), (2) missing character types (lowercase, uppercase, digit), and (3) repeating character sequences of 3+. Calculate the minimum changes needed for each violation type, then determine how operations can satisfy multiple constraints simultaneously.

**Key insight**: Some operations can fix multiple violations at once (e.g., replacing a character in a triple can add missing type AND break the sequence).

### Intermediate Approach - Greedy Operation Selection
Track how many character types are missing (0-3). Count sequences of 3+ repeating characters and how many replacements each needs. For short passwords (< 6), additions are required. For long passwords (> 20), deletions are required. For passwords in the valid length range, use replacements to fix repeating sequences and add missing types simultaneously.

**Key insight**: Replacements are most efficient in the 6-20 range; additions for <6; deletions for >20.

### Advanced Approach - Optimize Deletion Strategy
For passwords longer than 20, deletions are mandatory. Be smart about where to delete: deleting from repeating sequences can reduce the replacement count needed. For a sequence of length `k`, deleting `k % 3` characters optimally reduces replacements. Handle length, missing types, and repeating sequences in an order that minimizes total operations.

**Key insight**: When deleting is required, target deletions to reduce future replacement needs in repeating sequences.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Single Pass Analysis | O(n) | O(1) | Linear scan with constant state tracking |
| Two Pass | O(n) | O(n) | Store repeat sequences, then process |
| Greedy Optimization | O(n) | O(1) | Optimal single pass with decision logic |

Linear time with constant space is achievable and optimal.

## Common Mistakes

### Mistake 1: Not Combining Operations
```python
# Wrong: Counting violations independently
def strongPasswordChecker(password):
    n = len(password)
    missing_types = 3  # Assume all missing
    # Check for each type...

    length_changes = max(0, 6 - n) + max(0, n - 20)

    # Count repeats...
    repeat_changes = # ... count replacements needed

    return length_changes + missing_types + repeat_changes  # Overcounts!
```

**Why it fails**: Operations can satisfy multiple constraints. Adding a digit to a short password adds 1 to length AND provides missing type. Simply summing all needs overcounts.

**Fix**: Recognize that additions/replacements can add missing types; use `max()` to combine overlapping needs.

### Mistake 2: Incorrect Repeat Sequence Counting
```python
# Wrong: Not counting consecutive repeats properly
def strongPasswordChecker(password):
    repeats = 0
    for i in range(len(password) - 2):
        if password[i] == password[i+1] == password[i+2]:
            repeats += 1  # Counts overlapping, not total needed
    return repeats
```

**Why it fails**: For `"aaaa"`, this counts 2 violations but you need only 1 replacement. Need to count changes per sequence, not per violation.

**Fix**: Group consecutive characters, then calculate `len(group) // 3` replacements per group.

### Mistake 3: Wrong Priority for Length Violations
```python
# Wrong: Not prioritizing length constraints
def strongPasswordChecker(password):
    if len(password) < 6:
        return 6 - len(password)  # Missing other checks
    if len(password) > 20:
        return len(password) - 20  # Missing other checks
    # ... rest
```

**Why it fails**: Length alone isn't enough. A 7-character password `"aaaaaaa"` needs operations for repeats and missing types too.

**Fix**: Consider all constraints together, using operations that fix multiple issues.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Password Strength Meter | Easy | Rate password strength on a scale (weak/medium/strong) |
| Generate Strong Password | Medium | Generate random password meeting all criteria |
| Minimum Changes for Pattern | Medium | Adapt to different password rules (special chars, etc.) |
| Password Similarity Check | Hard | Check if two passwords are too similar |
| Dynamic Password Rules | Hard | Handle configurable/changing password requirements |

## Practice Checklist

Track your progress on this problem:

- [ ] **Day 0**: Solve basic case (6-20 length range) (35 min)
- [ ] **Day 1**: Review edge cases (very short, very long, all same char)
- [ ] **Day 3**: Implement handling for all length ranges (30 min)
- [ ] **Day 7**: Optimize deletion strategy for >20 length (25 min)
- [ ] **Day 14**: Explain how operations combine to fix multiple issues (15 min)
- [ ] **Day 30**: Speed solve in under 20 minutes

**Strategy**: See [Greedy Algorithms](../strategies/patterns/greedy.md)
