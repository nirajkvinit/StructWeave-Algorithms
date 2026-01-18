---
id: M278
old_id: A077
slug: fraction-addition-and-subtraction
title: Fraction Addition and Subtraction
difficulty: medium
category: medium
topics: ["string", "math"]
patterns: ["string-parsing", "greatest-common-divisor"]
estimated_time_minutes: 30
frequency: low
related_problems:
  - id: E001
    name: Two Sum
    difficulty: easy
  - id: M050
    name: Simplify Path
    difficulty: medium
  - id: M150
    name: Evaluate Reverse Polish Notation
    difficulty: medium
prerequisites:
  - concept: Greatest Common Divisor (GCD)
    level: intermediate
  - concept: Fraction arithmetic
    level: intermediate
  - concept: String parsing
    level: basic
---
# Fraction Addition and Subtraction

## Problem

Given a string expression representing a mathematical formula with fractions, calculate the result and return it as an irreducible fraction in string format. The expression contains only addition and subtraction of fractions like "-1/2+1/2+1/3". Each fraction is in the form numerator/denominator, and the first fraction may optionally start with a sign.

The core challenges are: (1) parsing the string to extract individual fractions with their signs, (2) adding fractions with different denominators by finding common denominators, and (3) simplifying the final result using the greatest common divisor (GCD). For example, "-1/2+1/2" evaluates to 0, which you must return as "0/1" (maintaining fraction format even for whole numbers).

Adding fractions requires finding a common denominator. For a/b + c/d, the result is (a×d + c×b)/(b×d). After summing all fractions, simplify by dividing both numerator and denominator by their GCD. Always ensure the denominator is positive, moving any negative sign to the numerator.

The string parsing is tricky because you must handle multi-digit numbers, optional leading signs, and distinguish between the minus sign as an operator versus a negative numerator. Consider preprocessing by adding a leading '+' if the first character isn't '-', making parsing uniform.


## Why This Matters

This problem combines three fundamental skills: string parsing, fraction arithmetic, and number theory (GCD). String parsing with state management appears in calculator implementations, expression evaluators, and compilers. Learning to carefully track signs and boundaries when extracting numbers from text is essential for processing mathematical or structured text input.

Fraction arithmetic teaches you to maintain exact precision instead of using floating-point approximation, crucial in financial calculations, scientific computing, and any domain where rounding errors are unacceptable. The GCD algorithm (Euclidean algorithm) is a cornerstone of number theory with applications in cryptography, simplification problems, and modular arithmetic.

This problem type appears in technical interviews for roles involving numerical processing or parsing, testing your ability to handle multiple concerns simultaneously: correct parsing logic, mathematical operations, and result simplification.

## Examples

**Example 1:**
- Input: `expression = "-1/2+1/2"`
- Output: `"0/1"`

**Example 2:**
- Input: `expression = "-1/2+1/2+1/3"`
- Output: `"1/3"`

**Example 3:**
- Input: `expression = "1/3-1/2"`
- Output: `"-1/6"`

## Constraints

- The input string only contains '0' to '9', '/', '+' and '-'. So does the output.
- Each fraction (input and output) has the format ±numerator/denominator. If the first input fraction or the output is positive, then '+' will be omitted.
- The input only contains valid **irreducible fractions**, where the **numerator** and **denominator** of each fraction will always be in the range [1, 10]. If the denominator is 1, it means this fraction is actually an integer in a fraction format defined above.
- The number of given fractions will be in the range [1, 10].
- The numerator and denominator of the **final result** are guaranteed to be valid and in the range of **32-bit** int.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Parsing the Expression</summary>

Parse the expression to extract individual fractions. You need to:
- Handle signs (positive/negative) for each fraction
- Extract numerator and denominator pairs
- Track the operator (+ or -) before each fraction

Consider using a pointer or index to scan through the string character by character. The key challenge is correctly parsing multi-digit numbers while handling signs.

```python
# Example parsing structure
def parse_fractions(expression):
    # Add '+' at start if first char is not '-'
    if expression[0] != '-':
        expression = '+' + expression

    fractions = []
    i = 0
    while i < len(expression):
        # Find sign, numerator, denominator
        # Store as tuple (numerator, denominator)
        pass
```
</details>

<details>
<summary>Hint 2: Adding Fractions with Common Denominator</summary>

To add fractions a/b + c/d, you need a common denominator:
- Result = (a*d + c*b) / (b*d)

Accumulate all fractions into a single result by:
1. Start with 0/1
2. For each fraction, find common denominator with current result
3. Add numerators and keep common denominator

Remember to handle subtraction as addition of negative numerator.

```python
# Fraction addition formula
numerator = num1 * den2 + num2 * den1
denominator = den1 * den2
```
</details>

<details>
<summary>Hint 3: Simplifying the Final Fraction</summary>

After accumulating all fractions, simplify using GCD (Greatest Common Divisor):
- Find GCD of absolute values of numerator and denominator
- Divide both by GCD
- Handle sign: if denominator is negative, move sign to numerator

```python
from math import gcd

def simplify(numerator, denominator):
    g = gcd(abs(numerator), abs(denominator))
    num = numerator // g
    den = denominator // g

    # Ensure denominator is positive
    if den < 0:
        num, den = -num, -den

    return f"{num}/{den}"
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| String Parsing + GCD | O(n + log(max(num, den))) | O(1) | n is expression length, GCD uses Euclidean algorithm |
| Optimal Solution | O(n) | O(1) | Linear scan with constant space |

**Detailed Analysis:**
- **Time**: O(n) to parse string + O(log M) for GCD where M is max value
- **Space**: O(1) auxiliary space (excluding output string)
- **Key Insight**: Each fraction operation takes constant time since values are bounded by constraints

## Common Mistakes

### Mistake 1: Forgetting to handle leading positive fractions
```python
# Wrong: Assumes expression starts with operator
expression = "1/2+1/3"
# Fails to parse first fraction correctly

# Correct: Normalize by adding '+' if needed
if expression[0] != '-':
    expression = '+' + expression
```

### Mistake 2: Not simplifying the fraction properly
```python
# Wrong: Only dividing by 2
result = f"{num//2}/{den//2}"

# Correct: Use GCD for complete simplification
from math import gcd
g = gcd(abs(num), abs(den))
result = f"{num//g}/{den//g}"
```

### Mistake 3: Incorrect sign handling in final result
```python
# Wrong: Leaving negative denominator
result = f"{-3}/{-6}"  # Should be "1/2"

# Correct: Ensure denominator is always positive
if den < 0:
    num, den = -num, -den
result = f"{num}/{den}"
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Fraction Multiplication | Evaluate expression with * and / operators | Medium |
| Mixed Numbers | Handle expressions with mixed numbers (e.g., "1 1/2") | Medium |
| Decimal to Fraction | Convert decimal results to fractions | Medium |
| Continued Fractions | Evaluate continued fraction expressions | Hard |

## Practice Checklist

Track your progress on mastering this problem:

- [ ] **Initial Attempt** - Solve independently (30 min limit)
- [ ] **Solution Study** - If stuck, study one approach deeply
- [ ] **Implementation** - Code solution from scratch without reference
- [ ] **Optimization** - Achieve O(n) time, O(1) space
- [ ] **Edge Cases** - Test: single fraction, all same denominator, negative results
- [ ] **Variations** - Solve at least 2 related problems
- [ ] **Spaced Repetition** - Re-solve after: 1 day, 1 week, 1 month

**Mastery Goal**: Solve in < 20 minutes with bug-free code.

**Strategy**: See [String Parsing Patterns](../strategies/patterns/string-manipulation.md)
