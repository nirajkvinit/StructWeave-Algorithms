---
id: H035
old_id: I024
slug: basic-calculator
title: Basic Calculator
difficulty: hard
category: hard
topics: ["string", "math"]
patterns: []
estimated_time_minutes: 45
---
# Basic Calculator

## Problem

You receive a string `s` containing a mathematically valid expression. Build a simple calculator that computes the expression's value and returns the final result.

**Note:** Built-in functions that parse and compute string-based mathematical expressions (like `eval()`) are **prohibited**.

## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Examples

**Example 1:**
- Input: `s = "1 + 1"`
- Output: `2`

**Example 2:**
- Input: `s = " 2-1 + 2 "`
- Output: `3`

**Example 3:**
- Input: `s = "(1+(4+5+2)-3)+(6+8)"`
- Output: `23`

## Constraints

- 1 <= s.length <= 3 * 10⁵
- s consists of digits, '+', '-', '(', ')', and ' '.
- s represents a valid expression.
- '+' is **not** used as a unary operation (i.e., "+1" and "+(2 + 3)" is invalid).
- '-' could be used as a unary operation (i.e., "-1" and "-(2 + 3)" is valid).
- There will be no two consecutive operators in the input.
- Every number and running calculation will fit in a signed 32-bit integer.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>Key Insight</summary>
Use a stack to handle parentheses and operator precedence. Since only addition and subtraction are involved (with parentheses), track the current result and sign. When encountering '(', push current result and sign onto stack. When encountering ')', pop from stack and apply the saved operation.
</details>

<details>
<summary>Main Approach</summary>
Iterate through the string character by character. Maintain current number, result, and sign (+1 or -1). For digits, build the current number. For operators, add/subtract current number to result and update sign. For '(', push current result and sign to stack and reset for subexpression. For ')', pop stack, multiply subexpression result by saved sign, and add to saved result.
</details>

<details>
<summary>Optimization Tip</summary>
Skip spaces while parsing. Handle multi-digit numbers by accumulating digits: num = num * 10 + digit. Remember that '-' before '(' affects all terms inside, so the sign should multiply through. The stack stores pairs: (result_before_paren, sign_before_paren).
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Recursive Parsing | O(n) | O(n) | Recursion stack for nested parentheses |
| Optimal (Stack) | O(n) | O(n) | Single pass, stack for parentheses |
| Two-Pass (Convert to postfix) | O(n) | O(n) | Convert to RPN then evaluate |

## Common Mistakes

1. **Not handling spaces correctly**
   ```python
   # Wrong: Processing spaces as characters
   if s[i] == ' ':
       # Error or incorrect processing

   # Correct: Skip spaces entirely
   if s[i] == ' ':
       continue
   ```

2. **Forgetting to process last number**
   ```python
   # Wrong: Number at end of string not added
   for char in s:
       if char.isdigit():
           num = num * 10 + int(char)

   # Correct: Add final number after loop
   for char in s:
       # ... process
   result += sign * num  # Don't forget last number
   ```

3. **Incorrect handling of nested parentheses**
   ```python
   # Wrong: Not preserving outer context when entering parentheses
   if char == '(':
       result = 0  # Loses previous result

   # Correct: Save and restore context
   if char == '(':
       stack.append((result, sign))
       result = 0
       sign = 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Basic Calculator II | Medium | Add multiplication/division, no parentheses |
| Basic Calculator III | Hard | All operators plus parentheses |
| Evaluate Reverse Polish Notation | Medium | Postfix notation, no operator precedence |
| Different Ways to Add Parentheses | Medium | Generate all valid parenthesizations |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Stack-Based Expression Evaluation](../../strategies/data-structures/stack.md)
