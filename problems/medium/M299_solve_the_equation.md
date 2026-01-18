---
id: M299
old_id: A107
slug: solve-the-equation
title: Solve the Equation
difficulty: medium
category: medium
topics: ["string", "math", "parsing"]
patterns: ["string-manipulation"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M150", "E224", "M227"]
prerequisites: ["E020", "M150"]
---
# Solve the Equation

## Problem

Write a program that parses and solves linear equations with one variable, `x`. The equation contains only addition, subtraction, the variable `x`, integers, and exactly one equals sign.

Given an equation string like `"x+5-3+x=6+x-2"`, determine:
- If there's a unique solution, return it as `"x=#value"` (e.g., `"x=2"`)
- If no value of x satisfies the equation, return `"No solution"` (e.g., `"x+1=x+2"`)
- If every value of x satisfies the equation, return `"Infinite solutions"` (e.g., `"x=x"`)

Important parsing details:
- Coefficients can be implicit: `"x"` means `"1x"` and `"-x"` means `"-1x"`
- The variable always appears as `x`, never with explicit coefficients like `"2x"` (you'd see `"x+x"` instead)
- Integers can be multiple digits: `"x+123=456"`
- No spaces or parentheses in the input

Example walkthrough for `"x+5-3+x=6+x-2"`:
1. Simplify left side: `2x + 2`
2. Simplify right side: `x + 4`
3. Rearrange to standard form: `2x - x = 4 - 2` → `x = 2`
4. Return `"x=2"`

The challenge is carefully parsing the string to extract coefficients and constants while handling signs, then determining which of the three cases applies based on the resulting equation form `ax = b`.

## Why This Matters

This problem teaches string parsing and state machine design - fundamental skills for building compilers, interpreters, or any system that processes structured text. Real-world applications include expression evaluators in spreadsheets, symbolic math systems like Wolfram Alpha, computer algebra systems, and even parsing query languages. The three solution cases (unique, none, infinite) teach you to recognize mathematical edge cases that many naive implementations miss. The problem also reinforces the algebra of rearranging equations into standard form, mirroring what compilers do when optimizing code: collecting like terms, simplifying expressions, and determining equivalences. Skills learned here apply to parsing DSLs (domain-specific languages), validating mathematical input, and building calculation engines.

## Examples

**Example 1:**
- Input: `equation = "x+5-3+x=6+x-2"`
- Output: `"x=2"`

**Example 2:**
- Input: `equation = "x=x"`
- Output: `"Infinite solutions"`

**Example 3:**
- Input: `equation = "2x=x"`
- Output: `"x=0"`

## Constraints

- 3 <= equation.length <= 1000
- equation has exactly one '='.
- equation consists of integers with an absolute value in the range [0, 100] without any leading zeros, and the variable 'x'.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Parse and Simplify Both Sides</summary>

The core idea is to rearrange the equation into the standard form: `ax = b`, where `a` is the coefficient of `x` and `b` is the constant term.

Split the equation at `'='` to get left and right sides. For each side, parse through the string to extract:
- Coefficient of `x` (sum all terms containing 'x')
- Constant terms (sum all numeric values)

Remember that `"x"` means `"1x"` and `"-x"` means `"-1x"`. Handle signs carefully when parsing.

</details>

<details>
<summary>Hint 2: Move All Terms to One Side</summary>

After parsing both sides, transform the equation to standard form by moving all x terms to the left and all constants to the right:
- `left_coeff * x + left_const = right_coeff * x + right_const`
- Rearrange to: `(left_coeff - right_coeff) * x = right_const - left_const`

Now you have the equation in the form `ax = b` where:
- `a = left_coeff - right_coeff`
- `b = right_const - left_const`

</details>

<details>
<summary>Hint 3: Handle Three Cases</summary>

Based on the coefficients, determine the solution type:

1. **Unique solution**: If `a != 0`, then `x = b / a`
   - Return `"x=" + str(b // a)`

2. **Infinite solutions**: If `a == 0` and `b == 0`
   - The equation is `0x = 0`, which is always true
   - Return `"Infinite solutions"`

3. **No solution**: If `a == 0` and `b != 0`
   - The equation is `0x = b` (where b != 0), which is impossible
   - Return `"No solution"`

The parsing logic is the trickiest part. Consider using state machine or careful index tracking to handle signs and coefficients.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Linear Parsing | O(n) | O(n) | Parse once, split string |
| Character-by-Character | O(n) | O(1) | Single pass with running counts |
| Regex Parsing | O(n) | O(n) | Using regular expressions |

**Recommended**: Character-by-character parsing for better control and edge case handling.

## Common Mistakes

1. **Forgetting implicit coefficient of 1**
```python
# Wrong: Treating "x" as having coefficient 0
if term == "x":
    coeff += 0  # Wrong!

# Correct: "x" means "1x"
if term == "x":
    coeff += 1
elif term == "-x":
    coeff -= 1
```

2. **Incorrect sign handling**
```python
# Wrong: Not tracking current sign
for char in equation:
    if char.isdigit():
        num = num * 10 + int(char)

# Correct: Track and apply sign
sign = 1
for char in equation:
    if char == '+':
        sign = 1
    elif char == '-':
        sign = -1
    elif char.isdigit():
        num = num * 10 + int(char)
```

3. **Not handling consecutive operators**
```python
# Wrong: Assuming well-formed input
if equation[i] == '-' and equation[i+1] == 'x':
    coeff -= 1  # May throw IndexError

# Correct: Parse carefully with bounds checking
i = 0
while i < len(equation):
    if equation[i] == '-':
        if i + 1 < len(equation) and equation[i+1] == 'x':
            coeff -= 1
            i += 2
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Multiple Variables | Hard | Solve system of linear equations |
| Quadratic Equations | Hard | Handle x² terms, two possible solutions |
| Inequalities | Medium | Solve linear inequalities (>, <, >=, <=) |
| Equation with Parentheses | Hard | Parse and evaluate nested expressions |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Implement basic string parsing to extract coefficients and constants
- [ ] Handle implicit coefficients (x means 1x, -x means -1x)
- [ ] Test all three cases: unique solution, infinite solutions, no solution
- [ ] Handle edge cases (x=x, 2x=2x, x+1=x+2)
- [ ] Optimize parsing to single pass with O(1) space
- [ ] Review after 1 day: Can you recall the three solution cases?
- [ ] Review after 1 week: Implement without looking at notes
- [ ] Review after 1 month: Solve a variation with parentheses

**Strategy**: See [String Manipulation Pattern](../strategies/patterns/string-manipulation.md)
