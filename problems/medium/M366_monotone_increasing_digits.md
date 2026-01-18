---
id: M366
old_id: A205
slug: monotone-increasing-digits
title: Monotone Increasing Digits
difficulty: medium
category: medium
topics: ["greedy", "math"]
patterns: ["digit-manipulation"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E009", "M402", "M738"]
prerequisites: ["greedy", "digit-extraction"]
---
# Monotone Increasing Digits

## Problem

A number has **monotone increasing digits** if each digit is greater than or equal to the digit before it when reading left to right. For example, 1234, 1333, and 1799 all have monotone increasing digits because the digits never decrease. However, 1232 does not because the final digit 2 is less than the previous digit 3.

Given an integer `n`, find the largest number that is less than or equal to `n` and has monotone increasing digits.

Let's look at some examples to clarify:
- If `n = 10`, the answer is `9` (since 10 has digits 1,0 which decrease)
- If `n = 1234`, the answer is `1234` itself (already monotone increasing)
- If `n = 332`, the answer is `299` (the largest monotone increasing number not exceeding 332)

The challenge is that you can't just check all numbers from `n` downward, because `n` can be up to 10⁹. You need a constructive approach that builds the answer by manipulating the digits of `n`.

The key insight is recognizing when digits violate the monotone property and figuring out how to fix them greedily. When you find a digit that's smaller than the previous one, you need to decrease an earlier digit and then maximize the remaining digits (by setting them to 9) to get the largest valid result.

## Why This Matters

This problem teaches greedy algorithms through digit manipulation, a pattern that appears in many number-based problems. The skill of thinking about numbers as sequences of digits, rather than atomic values, is fundamental to problems involving number constraints.

Similar digit-manipulation techniques appear in problems like removing digits to form the smallest number, finding the next permutation of digits, or constructing numbers with specific properties. These patterns are common in competitive programming and technical interviews.

The greedy backtracking approach you'll develop here also teaches an important lesson: sometimes the "obvious" greedy choice creates problems later, and you need to backtrack to find where to make your greedy decision. This builds intuition for when pure greedy works versus when you need dynamic programming or more sophisticated techniques.

## Examples

**Example 1:**
- Input: `n = 10`
- Output: `9`

**Example 2:**
- Input: `n = 1234`
- Output: `1234`

**Example 3:**
- Input: `n = 332`
- Output: `299`

## Constraints

- 0 <= n <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Find the Violation Point</summary>

Convert the number to a string/array of digits and scan from left to right:
1. Find the first position where `digit[i] > digit[i+1]` (violation of monotone property)
2. If no violation exists, return `n` (already monotone increasing)
3. If a violation exists, you need to reduce a digit to make it monotone

Example: `332` → violation at position 1 (3 > 2)

</details>

<details>
<summary>Hint 2: Greedy Reduction Strategy</summary>

When you find a violation at position `i`:
1. Decrease `digit[i]` by 1
2. Set all digits after position `i` to 9 (maximize the result)
3. Check if decreasing `digit[i]` creates a new violation with `digit[i-1]`
4. If yes, move backward and repeat (greedy backtracking)

Example: `332`
- Violation at index 1: digit[1]=3, digit[2]=2
- Decrease digit[1]: 322, but 3 > 2 still violated
- Also decrease digit[0]: 299 ✓

</details>

<details>
<summary>Hint 3: Mark and Fill Approach</summary>

Use a marker to track where to start filling with 9s:
```
1. Convert n to digit array
2. Find rightmost position where digit[i] > digit[i+1]
3. Backtrack to find the leftmost position in a sequence of equal/decreasing digits
4. Decrease that digit by 1
5. Fill all positions after it with 9
```

Example: `1234321` → violation at index 3 (4 > 3)
- Result: `1233999`

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| String manipulation | O(d) | O(d) | Convert to string, scan once with possible backtrack; d = number of digits |
| Digit array | O(d) | O(d) | Same logic but using array instead of string |
| Mathematical | O(d²) | O(1) | Extract digits mathematically, may need multiple passes |

Where d = log₁₀(n), the number of digits in n.

## Common Mistakes

**Mistake 1: Not backtracking far enough**
```python
# Wrong - only decreases at violation point
digits = list(str(n))
for i in range(len(digits) - 1):
    if digits[i] > digits[i+1]:
        digits[i] = str(int(digits[i]) - 1)
        for j in range(i+1, len(digits)):
            digits[j] = '9'
        break
# Fails for 1000 → gives 0999 instead of 999

# Correct - backtrack to handle cascading violations
mark = len(digits)
for i in range(len(digits) - 1):
    if digits[i] > digits[i+1]:
        mark = i
        break
if mark < len(digits):
    while mark > 0 and digits[mark-1] >= digits[mark]:
        mark -= 1
    digits[mark] = str(int(digits[mark]) - 1)
    for i in range(mark+1, len(digits)):
        digits[i] = '9'
```

**Mistake 2: Not handling consecutive equal digits**
```python
# Wrong - doesn't consider sequences like 333...
if digits[i] > digits[i+1]:
    digits[i] -= 1
# Fails for 3332 → should give 2999, not 3229

# Correct - find the start of the equal sequence
# When 3332: all three 3's need to become 2999
```

**Mistake 3: Off-by-one errors in string/digit conversion**
```python
# Wrong - forgets to handle leading zeros after decrement
digits[mark] = digits[mark] - 1
# If digits[mark] was '0', this becomes -1!

# Correct - check bounds and handle edge cases
if mark == 0 and int(digits[mark]) == 1:
    # Special case: 1000 → 999 (remove leading digit)
    digits = digits[1:]
    for i in range(len(digits)):
        digits[i] = '9'
```

## Variations

| Variation | Difference | Difficulty |
|-----------|------------|------------|
| Monotone Decreasing Digits | Find max with digits in decreasing order | Medium |
| Remove K Digits | Remove k digits to form smallest number | Medium |
| Next Greater Element III | Find next greater number with same digits | Medium |
| Largest Number | Arrange numbers to form largest value | Medium |

## Practice Checklist

- [ ] Solve with greedy backtracking approach
- [ ] Test edge cases: 0, 9, 10, 1234, 332, 1000
- [ ] Handle consecutive equal digits correctly
- [ ] Test with all digits same: 3333
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Explain why greedy works for this problem
- [ ] Implement without string conversion (pure math)
- [ ] Trace through example 332 → 299 step by step
