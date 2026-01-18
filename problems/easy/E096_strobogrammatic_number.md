---
id: E096
old_id: I046
slug: strobogrammatic-number
title: Strobogrammatic Number
difficulty: easy
category: easy
topics: ["string"]
patterns: ["two-pointers"]
estimated_time_minutes: 15
frequency: low
related_problems: ["E247", "M247", "M248"]
prerequisites: ["two-pointers", "hash-table"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Strobogrammatic Number

## Problem

A strobogrammatic number is a number that looks the same when rotated 180 degrees. When you flip the entire number upside down, it reads identically to the original. Think of how certain digits transform when rotated: 0 stays 0, 1 stays 1, 6 becomes 9, 8 stays 8, and 9 becomes 6. All other digits (2, 3, 4, 5, 7) become invalid when rotated.

Given a string `num` representing a number, determine whether it's strobogrammatic. You need to check two things simultaneously: first, that every digit in the number is one that remains valid when rotated (0, 1, 6, 8, 9), and second, that the number reads the same when you flip these digits.

Here's a subtle constraint that makes the problem solvable efficiently: you're guaranteed the input won't have leading zeros except for the number zero itself. This means you don't need special handling for cases like "00" or "090".

The trick is to check the number from both ends simultaneously using two pointers. For each pair of digits at symmetric positions, verify that the left digit rotates to match the right digit. Be especially careful with the middle digit in odd-length numbers: it must rotate to itself (0, 1, or 8 only).

## Why This Matters

While detecting strobogrammatic numbers might seem like a puzzle, it teaches valuable pattern recognition and symmetry checking skills. The two-pointer technique demonstrated here applies broadly to palindrome checking, string validation, and any problem requiring symmetric comparisons.

This problem highlights the importance of understanding problem constraints. The fact that certain digits can't be rotated at all, and that some digits map to different digits, requires building a mapping and checking it carefully. This type of constraint-driven logic appears in form validation, data normalization, and encoding problems.

The problem also demonstrates how a hash map can elegantly encode transformation rules. Instead of a series of if-statements, you build a lookup table that makes the logic clear and maintainable. This pattern appears in character encoding, cipher implementations, and data transformation pipelines.

Though this specific problem is somewhat niche, variations appear in interview settings to test your ability to handle string manipulation with complex rules. It's also a gateway to harder problems like generating all n-digit strobogrammatic numbers or counting strobogrammatic numbers in a range, which require backtracking and combinatorics.

## Examples

**Example 1:**
- Input: `num = "69"`
- Output: `true`

**Example 2:**
- Input: `num = "88"`
- Output: `true`

**Example 3:**
- Input: `num = "962"`
- Output: `false`

## Constraints

- 1 <= num.length <= 50
- num consists of only digits.
- num does not contain any leading zeros except for zero itself.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Identify Valid Digit Pairs</summary>

First, identify which digits remain valid after 180-degree rotation: 0→0, 1→1, 6→9, 8→8, 9→6. Any other digit (2, 3, 4, 5, 7) makes the number invalid. The key insight is that you need to check both the digit itself AND what it maps to when rotated.

</details>

<details>
<summary>🎯 Hint 2: Two-Pointer Symmetry Check</summary>

Use two pointers starting from both ends of the string. For each pair of characters at positions i and j, verify that num[i] rotates to num[j] and vice versa. A hash map can store the rotation mappings: {0:0, 1:1, 6:9, 8:8, 9:6}.

</details>

<details>
<summary>📝 Hint 3: Handle Middle Character</summary>

Pseudocode approach:
1. Create mapping: {0→0, 1→1, 6→9, 8→8, 9→6}
2. Set left = 0, right = length - 1
3. While left <= right:
   - Check if num[left] exists in mapping
   - Check if mapping[num[left]] == num[right]
   - Move pointers inward
4. Return true if all checks pass

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Reverse & Compare) | O(n) | O(n) | Build rotated string, compare |
| **Optimal (Two Pointers)** | **O(n)** | **O(1)** | Single pass with constant space |

## Common Mistakes

### Mistake 1: Forgetting Invalid Digits

```python
# WRONG: Only checking valid pairs, not rejecting invalid digits
def isStrobogrammatic(num):
    pairs = {'0':'0', '1':'1', '6':'9', '8':'8', '9':'6'}
    left, right = 0, len(num) - 1
    while left <= right:
        if num[left] in pairs and pairs[num[left]] == num[right]:
            left += 1
            right -= 1
        else:
            return False  # This catches invalid, but logic is unclear
```

```python
# CORRECT: Explicitly check for invalid digits
def isStrobogrammatic(num):
    pairs = {'0':'0', '1':'1', '6':'9', '8':'8', '9':'6'}
    left, right = 0, len(num) - 1
    while left <= right:
        if num[left] not in pairs or pairs[num[left]] != num[right]:
            return False  # Clear: either invalid digit OR wrong pairing
        left += 1
        right -= 1
    return True
```

### Mistake 2: Building Entire Rotated String

```python
# WRONG: Wasteful space usage
def isStrobogrammatic(num):
    pairs = {'0':'0', '1':'1', '6':'9', '8':'8', '9':'6'}
    rotated = []
    for char in num:
        if char not in pairs:
            return False
        rotated.append(pairs[char])
    return ''.join(reversed(rotated)) == num  # O(n) space
```

```python
# CORRECT: Check in-place with two pointers
def isStrobogrammatic(num):
    pairs = {'0':'0', '1':'1', '6':'9', '8':'8', '9':'6'}
    left, right = 0, len(num) - 1
    while left <= right:
        if num[left] not in pairs or pairs[num[left]] != num[right]:
            return False
        left += 1
        right -= 1
    return True  # O(1) space
```

### Mistake 3: Middle Character Edge Case

```python
# WRONG: Failing to validate middle character in odd-length strings
def isStrobogrammatic(num):
    pairs = {'0':'0', '1':'1', '6':'9', '8':'8', '9':'6'}
    left, right = 0, len(num) - 1
    while left < right:  # Bug: doesn't check middle when left == right
        if num[left] not in pairs or pairs[num[left]] != num[right]:
            return False
        left += 1
        right -= 1
    return True  # "6" would return true incorrectly
```

```python
# CORRECT: Use <= to validate middle character
def isStrobogrammatic(num):
    pairs = {'0':'0', '1':'1', '6':'9', '8':'8', '9':'6'}
    left, right = 0, len(num) - 1
    while left <= right:  # Checks middle when left == right
        if num[left] not in pairs or pairs[num[left]] != num[right]:
            return False
        left += 1
        right -= 1
    return True  # "6" correctly returns false (6→9, not 6)
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Count Strobogrammatic Numbers in Range | Medium | Generate all valid numbers up to n digits |
| Strobogrammatic Number II | Medium | Generate all n-digit strobogrammatic numbers |
| Strobogrammatic Number III | Hard | Count strobogrammatic numbers in [low, high] range |
| Confusing Number | Easy | Check if number is different from its rotation |

## Practice Checklist

- [ ] Day 1: Solve with two pointers (15 min)
- [ ] Day 2: Implement without looking (10 min)
- [ ] Day 7: Solve again, optimize space (10 min)
- [ ] Day 14: Explain approach to someone (5 min)
- [ ] Day 30: Code from memory (5 min)

**Strategy**: See [Two Pointers Pattern](../strategies/patterns/two-pointers.md)
