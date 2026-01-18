---
id: M246
old_id: A034
slug: complex-number-multiplication
title: Complex Number Multiplication
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
frequency: low
related_problems:
  - id: E001
    title: Two Sum
    difficulty: easy
  - id: M001
    title: Add Two Numbers
    difficulty: medium
prerequisites:
  - String parsing
  - Complex number arithmetic
  - Mathematical formulas
---
# Complex Number Multiplication

## Problem

Given two complex numbers represented as strings in the form "a+bi", compute their product and return it in the same string format. Complex numbers extend regular numbers by including an imaginary component with the unit i, where i² = -1. In the notation "a+bi", the value 'a' is the real part and 'b' is the imaginary part, both integers between -100 and 100.

For example, "3+2i" represents the complex number with real part 3 and imaginary part 2. To multiply two complex numbers like (1+i) and (1+i), you use the distributive property just like multiplying binomials, then apply the rule that i² = -1. So (1+i) * (1+i) = 1 + i + i + i² = 1 + 2i + (-1) = 0 + 2i, which you'd return as the string "0+2i".

An important parsing consideration: the sign of the imaginary part might be negative, giving you strings like "1+-2i" (meaning 1 + (-2)i or 1 - 2i). Your parser needs to correctly extract both the real and imaginary components including their signs, then apply the multiplication formula: (a+bi)(c+di) = (ac-bd) + (ad+bc)i, where the -bd term comes from multiplying the imaginary parts and applying i² = -1.

## Why This Matters

While complex numbers might seem like pure mathematics, they're fundamental in many engineering fields: electrical engineering (analyzing AC circuits), signal processing (Fourier transforms), quantum computing (qubit states), and computer graphics (rotations and transformations). This problem teaches you to translate mathematical formulas into code, handle structured string parsing with signs and delimiters, and manage the subtleties of string formatting for output. The pattern of parsing structured text, applying a formula, and formatting results appears frequently in data processing, calculator implementations, and systems that consume or produce domain-specific notation like mathematical expressions or chemical formulas.

## Examples

**Example 1:**
- Input: `num1 = "1+1i", num2 = "1+1i"`
- Output: `"0+2i"`
- Explanation: (1 + i) * (1 + i) = 1 + i2 + 2 * i = 2i, and you need convert it to the form of 0+2i.

**Example 2:**
- Input: `num1 = "1+-1i", num2 = "1+-1i"`
- Output: `"0+-2i"`
- Explanation: (1 - i) * (1 - i) = 1 + i2 - 2 * i = -2i, and you need convert it to the form of 0+-2i.

## Constraints

- num1 and num2 are valid complex numbers.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Complex number multiplication formula</summary>

For two complex numbers (a + bi) and (c + di), their product is:
```
(a + bi) * (c + di) = ac + adi + bci + bdi²
                     = ac + adi + bci - bd    (since i² = -1)
                     = (ac - bd) + (ad + bc)i
```

Real part: ac - bd
Imaginary part: ad + bc

</details>

<details>
<summary>Hint 2: Parsing the input strings</summary>

Parse "a+bi" to extract values a and b:
1. Find the '+' or '-' that separates real and imaginary parts (not the leading sign!)
2. Real part: substring before the separator
3. Imaginary part: substring after separator, excluding the 'i'

Edge case: "1+-2i" has real=1, imaginary=-2

</details>

<details>
<summary>Hint 3: String formatting for output</summary>

After computing real and imaginary parts:
```python
result = f"{real}+{imag}i"
```

Handle the sign correctly:
- If imag is negative, the format automatically becomes "real+-imagi"
- This matches the expected output format

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| String parsing + formula | O(1) | O(1) | String lengths bounded by constraint; constant operations |
| Regular expression | O(1) | O(1) | Regex parsing adds overhead but still constant time |
| Split and convert | O(1) | O(1) | Most straightforward implementation |

## Common Mistakes

1. Incorrect parsing of negative imaginary parts

```python
# Wrong: Fails for "1+-2i"
parts = num.split('+')
real = int(parts[0])
imag = int(parts[1][:-1])  # Removes 'i' but doesn't handle '-'

# Correct: Find the right separator position
def parse(num):
    # Find + or - after the first character (skip leading sign)
    idx = max(num.find('+', 1), num.find('-', 1))
    real = int(num[:idx])
    imag = int(num[idx:-1])  # Includes the sign
    return real, imag
```

2. Forgetting that i² = -1

```python
# Wrong: Not applying i² = -1
real = a * c + b * d
imag = a * d + b * c

# Correct: Apply i² = -1 transformation
real = a * c - b * d  # Subtract bd, not add
imag = a * d + b * c
```

3. Incorrect output formatting for negative imaginary

```python
# Wrong: Double sign for negative imaginary
if imag >= 0:
    return f"{real}+{imag}i"
else:
    return f"{real}+{imag}i"  # Produces "1+--2i" if imag=-2

# Correct: Format naturally handles sign
return f"{real}+{imag}i"  # Automatically becomes "1+-2i"
```

## Variations

| Variation | Difference | Strategy |
|-----------|-----------|----------|
| Complex division | Divide instead of multiply | Use conjugate: (a+bi)/(c+di) = (a+bi)(c-di)/(c²+d²) |
| Complex addition | Add two complex numbers | real = a+c, imag = b+d |
| Polar form | Use magnitude and angle | Convert to polar, multiply magnitudes, add angles |
| Higher powers | Compute (a+bi)^n | Use repeated multiplication or De Moivre's theorem |

## Practice Checklist

- [ ] Implement string parsing solution (20 min)
- [ ] Test with negative numbers (both real and imaginary)
- [ ] Verify formula application (i² = -1)
- [ ] Review after 1 day - implement division variant
- [ ] Review after 1 week - implement with regex parsing
- [ ] Review after 1 month - solve using polar coordinates

**Strategy**: String parsing with complex number multiplication formula (a+bi)(c+di) = (ac-bd)+(ad+bc)i
