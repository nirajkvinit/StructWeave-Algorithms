---
id: M394
old_id: A239
slug: basic-calculator-iii
title: Basic Calculator III
difficulty: medium
category: medium
topics: ["math"]
patterns: []
estimated_time_minutes: 30
---
# Basic Calculator III

## Problem

Build a calculator that evaluates arithmetic expressions given as strings. The expressions contain non-negative integers and four operators: addition (`+`), subtraction (`-`), multiplication (`*`), and division (`/`). Parentheses `(` and `)` are used for grouping subexpressions. Division should truncate toward zero (discard the decimal part).

You must respect standard operator precedence: multiplication and division are evaluated before addition and subtraction. Parentheses override this precedence by forcing inner expressions to evaluate first. For example, `"2*(5+5*2)/3+(6/2+8)"` requires evaluating the innermost parentheses first: `5*2=10`, then `5+10=15`, then `2*15=30`, then `30/3=10`, then `6/2=3`, then `3+8=11`, and finally `10+11=21`.

The challenge is handling operator precedence without using built-in evaluation functions like `eval()`. All intermediate calculations stay within the 32-bit integer range `[-2³¹, 2³¹ - 1]`, and you can assume the input is always syntactically valid (balanced parentheses, no invalid operator sequences).

A key insight: you can handle precedence by processing multiplication and division immediately as you encounter them, while deferring addition and subtraction by storing intermediate results on a stack. Parentheses require either recursive evaluation of subexpressions or maintaining a separate operator stack.

## Why This Matters

Expression evaluation is fundamental to building compilers, interpreters, and formula engines in spreadsheet applications. This problem teaches the classic stack-based parsing technique used in converting infix notation (how humans write math) to postfix notation (how computers evaluate it efficiently). The skills you develop here - managing operator precedence, handling nested structures with stacks or recursion, and parsing strings character by character - directly translate to building domain-specific languages, configuration parsers, and query engines. This problem is extremely popular in technical interviews because it tests multiple competencies: string parsing, stack manipulation, recursion, and careful handling of edge cases like division by numbers that produce decimals.

## Examples

**Example 1:**
- Input: `s = "1+1"`
- Output: `2`

**Example 2:**
- Input: `s = "6-4/2"`
- Output: `4`

**Example 3:**
- Input: `s = "2*(5+5*2)/3+(6/2+8)"`
- Output: `21`

## Constraints

- 1 <= s <= 10⁴
- s consists of digits, '+', '-', '*', '/', '(', and ')'.
- s is a **valid** expression.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Handle operator precedence by evaluating multiplication and division immediately, while deferring addition and subtraction. Use a stack to handle parentheses by recursively evaluating sub-expressions.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use a stack to store numbers and a variable to track the current operation. Process multiplication/division immediately by popping from the stack, computing, and pushing back. For parentheses, recursively evaluate the inner expression. Finally, sum all stack values.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Handle parentheses recursively or use a separate stack for operators and operands. Keep track of position with an index pointer to handle nested expressions efficiently without string slicing.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Recursive Descent | O(n) | O(n) | Stack depth for nested parentheses |
| Optimal | O(n) | O(n) | Single pass with stack for intermediate results |

## Common Mistakes

1. **Incorrect Operator Precedence**
   ```python
   # Wrong: Evaluating left to right without precedence
   result = 0
   for i, char in enumerate(s):
       if char == '+':
           result += next_num
       elif char == '*':
           result *= next_num

   # Correct: Handle * and / immediately via stack
   if op == '+':
       stack.append(num)
   elif op == '*':
       stack.append(stack.pop() * num)
   ```

2. **Not Handling Nested Parentheses**
   ```python
   # Wrong: Simple replacement without recursion
   if char == '(':
       inner = s[i+1:s.index(')')]
       result = evaluate(inner)

   # Correct: Track parenthesis depth and recurse
   if char == '(':
       count = 1
       j = i + 1
       while count > 0:
           if s[j] == '(': count += 1
           if s[j] == ')': count -= 1
           j += 1
       result = calculate(s[i+1:j-1])
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Basic Calculator (I) | Hard | Only +, -, and parentheses |
| Basic Calculator II | Medium | No parentheses, only +, -, *, / |
| Expression Add Operators | Hard | Insert operators to reach target value |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Stack Applications](../../prerequisites/stack.md)
