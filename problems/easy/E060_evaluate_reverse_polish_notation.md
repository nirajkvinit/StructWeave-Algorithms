---
id: E060
old_id: F150
slug: evaluate-reverse-polish-notation
title: Evaluate Reverse Polish Notation
difficulty: easy
category: easy
topics: ["array", "stack", "math"]
patterns: ["stack-operations"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["M224", "M227", "H772"]
prerequisites: ["stack-basics", "arithmetic-operations"]
strategy_ref: ../prerequisites/stack.md
---
# Evaluate Reverse Polish Notation

## Problem

Given an array of strings representing an arithmetic expression in Reverse Polish Notation (RPN), evaluate it and return the result.

**Reverse Polish Notation** (also called postfix notation) places operators after their operands instead of between them. For example:
- Normal notation (infix): `(2 + 1) * 3`
- RPN: `["2", "1", "+", "3", "*"]`

To evaluate RPN, process tokens from left to right. When you see a number, remember it. When you see an operator (+, -, *, /), apply it to the most recent two numbers.

Think of it like a calculator where you enter both numbers first, then press the operation button. The numbers ["2", "1", "+"] means: enter 2, enter 1, press add, resulting in 3.

Valid operators are +, -, *, and /. Division should truncate toward zero (so 7/3 = 2 and -7/3 = -2, not -3).

**Watch out for:**
- Operand order matters for subtraction and division. In "5 3 -", you compute 5 - 3, not 3 - 5.
- Division truncates toward zero, not toward negative infinity (Python's default).
- All tokens are either integers (possibly negative like "-11") or one of the four operators.

## Why This Matters

Reverse Polish Notation demonstrates stack-based evaluation, used in:
- Early calculators and programming languages (Forth, PostScript)
- Java Virtual Machine and other bytecode interpreters (stack-based instruction sets)
- Expression parsing in compilers (converting infix to postfix avoids precedence issues)
- Evaluating formulas in spreadsheets and math software

Understanding RPN teaches how to use a stack to maintain state during sequential processing. This pattern appears in parsing nested structures, validating balanced parentheses, and implementing undo/redo functionality.

## Examples

**Example 1:**
- Input: `tokens = ["2","1","+","3","*"]`
- Output: `9`
- Explanation: ((2 + 1) * 3) = 9

**Example 2:**
- Input: `tokens = ["4","13","5","/","+"]`
- Output: `6`
- Explanation: (4 + (13 / 5)) = 6

**Example 3:**
- Input: `tokens = ["10","6","9","3","+","-11","*","/","*","17","+","5","+"]`
- Output: `22`
- Explanation: ((10 * (6 / ((9 + 3) * -11))) + 17) + 5
= ((10 * (6 / (12 * -11))) + 17) + 5
= ((10 * (6 / -132)) + 17) + 5
= ((10 * 0) + 17) + 5
= (0 + 17) + 5
= 17 + 5
= 22

## Constraints

- 1 <= tokens.length <= 10⁴
- tokens[i] is either an operator: "+", "-", "*", or "/", or an integer in the range [-200, 200].

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Understanding Reverse Polish Notation</summary>

Reverse Polish Notation (RPN), also called postfix notation, places operators after their operands. For example:
- Infix: `(2 + 1) * 3`
- RPN: `2 1 + 3 *`

When you encounter an operator, you apply it to the most recent operands. What data structure naturally stores "most recent" items and allows you to retrieve them in reverse order?

Think about: when you see "2 1 +", you need to remember both 2 and 1, then apply + to them in order.

</details>

<details>
<summary>🎯 Hint 2: Stack-Based Evaluation</summary>

Use a stack to track operands:
1. Process tokens left to right
2. If token is a number, push it onto the stack
3. If token is an operator, pop two operands, apply the operation, and push the result back

Key insight: The second-to-top element is the left operand, and the top element is the right operand. So for subtraction and division, order matters!

For "4 13 5 / +":
- Push 4, 13, 5
- See "/": pop 5 and 13, compute 13/5=2, push 2
- See "+": pop 2 and 4, compute 4+2=6, push 6

</details>

<details>
<summary>📝 Hint 3: Step-by-Step Algorithm</summary>

```
1. Create empty stack
2. Create set of operators: {'+', '-', '*', '/'}
3. For each token in tokens:
   a. If token is not an operator:
      - Convert to integer and push to stack
   b. Else (token is operator):
      - Pop right operand from stack
      - Pop left operand from stack
      - Apply operator: result = left op right
      - Push result to stack
4. Return the single value remaining on stack
```

Important: For "/" use integer division truncating toward zero.

Time: O(n), Space: O(n)

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| **Stack** | **O(n)** | **O(n)** | Optimal; process each token once |
| Recursive | O(n) | O(n) | Build expression tree, harder to implement |

## Common Mistakes

### 1. Wrong Operand Order
```python
# WRONG: Subtraction and division are not commutative
right = stack.pop()
left = stack.pop()
result = right - left  # Should be left - right

# CORRECT: Left operand is popped second
right = stack.pop()
left = stack.pop()
result = left - right
```

### 2. Incorrect Division Handling
```python
# WRONG: Python's // rounds toward negative infinity
result = left // right  # -1 // 2 = -1 (wrong)

# CORRECT: Truncate toward zero
result = int(left / right)  # int(-1 / 2) = 0
```

### 3. Not Converting String to Integer
```python
# WRONG: Pushing string instead of integer
if token not in operators:
    stack.append(token)  # Still a string!

# CORRECT: Convert to integer
if token not in operators:
    stack.append(int(token))
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Infix Notation | Standard math notation with parentheses | Use Shunting Yard algorithm or two stacks |
| Prefix Notation | Operators before operands | Process right to left |
| Additional Operators | Add ^, %, etc. | Extend operator handling in switch/if |
| Validate RPN | Check if expression is valid | Track stack size, check for single result |

## Practice Checklist

**Correctness:**
- [ ] Handles single number
- [ ] Handles negative numbers
- [ ] Handles division (truncates toward zero)
- [ ] Handles all four operators correctly
- [ ] Maintains correct operand order
- [ ] Returns final result (single stack value)

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 12 minutes
- [ ] Can explain RPN vs infix notation
- [ ] Can trace through example by hand

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Stack Pattern](../../prerequisites/stack.md)
