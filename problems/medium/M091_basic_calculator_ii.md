---
id: M091
old_id: I027
slug: basic-calculator-ii
title: Basic Calculator II
difficulty: medium
category: medium
topics: ["string", "math", "stack"]
patterns: ["stack"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M224", "H772", "E020"]
prerequisites: ["stack", "operator-precedence", "string-parsing"]
---
# Basic Calculator II

## Problem

You receive a string `s` containing a mathematical expression made up of integers and the four basic operators: addition (`+`), subtraction (`-`), multiplication (`*`), and division (`/`). Your task is to evaluate this expression and return the final numerical result. Think of this as building a simplified calculator that can handle expressions like `"3+2*2"` or `" 3/2 "`. The tricky part is that you need to respect operator precedence, meaning multiplication and division must be performed before addition and subtraction, just like in standard arithmetic. When performing division with integers, truncate the result toward zero (so `-3/2` becomes `-1`, not `-2`). The expression may contain spaces between numbers and operators, but it's guaranteed to be well-formed with valid syntax. All intermediate calculations will fit comfortably within 32-bit integer range. As an important constraint, you cannot use built-in expression evaluation functions like `eval()`, since the goal is to understand how to parse and compute expressions manually.

## Why This Matters

This problem mirrors the core logic behind calculators, spreadsheet formula engines, and programming language interpreters. When you type a formula into Excel or evaluate an expression in Python, the system must parse the string, respect operator precedence, and compute the result in the correct order. Compiler designers use similar stack-based techniques to convert infix expressions (what humans write) into executable code. Understanding expression parsing also prepares you for more complex tasks like building query parsers for databases, interpreting mathematical notation in educational software, or creating custom domain-specific languages. This is a foundational skill that bridges string processing, algorithm design, and practical software engineering.

## Examples

**Example 1:**
- Input: `s = "3+2*2"`
- Output: `7`

**Example 2:**
- Input: `s = " 3/2 "`
- Output: `1`

**Example 3:**
- Input: `s = " 3+5 / 2 "`
- Output: `5`

## Constraints

- 1 <= s.length <= 3 * 10⁵
- s consists of integers and operators ('+', '-', '*', '/') separated by some number of spaces.
- s represents **a valid expression**.
- All the integers in the expression are non-negative integers in the range [0, 2³¹ - 1].
- The answer is **guaranteed** to fit in a **32-bit integer**.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

The key challenge is operator precedence: multiplication and division must be evaluated before addition and subtraction. Think about how you can process the string left-to-right while respecting this precedence. What if you could handle high-precedence operations immediately and defer low-precedence ones?

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

Use a stack to handle deferred operations. As you scan the string, parse numbers and operators. For '+' and '-', push the number (or its negative) onto the stack for later summation. For '*' and '/', immediately apply the operation with the last number on the stack. At the end, sum all numbers in the stack.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

```
stack = []
num = 0
operation = '+'

for i, char in enumerate(s):
  if char.isdigit():
    num = num * 10 + int(char)

  if char in '+-*/' or i == len(s) - 1:
    if operation == '+':
      stack.append(num)
    elif operation == '-':
      stack.append(-num)
    elif operation == '*':
      stack.append(stack.pop() * num)
    elif operation == '/':
      stack.append(int(stack.pop() / num))

    operation = char
    num = 0

return sum(stack)
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Recursive Parser | O(n) | O(n) | Build expression tree, evaluate recursively |
| **Stack-Based** | **O(n)** | **O(n)** | Single pass with stack for deferred operations |
| Two-Pass | O(n) | O(n) | First pass for */, second for +- |

## Common Mistakes

### Mistake 1: Not handling spaces correctly
```python
# Wrong - doesn't skip spaces
for char in s:
    if char.isdigit():
        num = num * 10 + int(char)
    elif char in operators:
        process_operation()

# Correct - skip spaces or check for them
for char in s:
    if char == ' ':
        continue
    if char.isdigit():
        num = num * 10 + int(char)
```

### Mistake 2: Integer division truncation toward negative infinity
```python
# Wrong - Python's // rounds toward negative infinity
result = stack.pop() // num  # -3//2 = -2, but we want -1

# Correct - use int() to truncate toward zero
result = int(stack.pop() / num)  # -3/2 = -1.5 -> -1
```

### Mistake 3: Not processing the last number
```python
# Wrong - loop ends without processing final number
for i, char in enumerate(s):
    if char.isdigit():
        num = num * 10 + int(char)
    if char in '+-*/':
        process_operation()
# Last number never processed!

# Correct - check if we're at the last character OR an operator
if char in '+-*/' or i == len(s) - 1:
    process_operation()
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Basic Calculator I | Hard | Includes parentheses |
| Basic Calculator III | Hard | Parentheses + all operators |
| Expression Add Operators | Hard | Insert operators to reach target |
| Different Ways to Add Parentheses | Medium | Generate all possible results |

## Practice Checklist

- [ ] Implement stack-based solution
- [ ] Test with spaces in various positions
- [ ] Test with single number
- [ ] Test expression with all four operators
- [ ] Verify division truncation toward zero
- [ ] Handle multi-digit numbers correctly
- [ ] Test with no spaces between numbers and operators

**Spaced Repetition Schedule:**
- Day 1: Initial attempt, understand operator precedence
- Day 3: Implement without hints
- Day 7: Solve Basic Calculator I (with parentheses)
- Day 14: Optimize space or implement two-pointer version
- Day 30: Speed solve under 20 minutes

**Strategy**: See [Stack Pattern](../prerequisites/stacks.md)
