---
id: F027
euler_id: 42
slug: coded-triangle-numbers
title: Coded Triangle Numbers
difficulty: foundation
topics: ["math", "triangular-numbers", "strings"]
patterns: []
estimated_time_minutes: 12
prerequisites: ["programming-basics"]
---

# Coded Triangle Numbers

## Problem

A triangular number T(n) is the sum of the first n natural numbers: T(n) = 1 + 2 + 3 + ... + n = n(n+1)/2.

For example:
- T(1) = 1
- T(2) = 1 + 2 = 3
- T(3) = 1 + 2 + 3 = 6
- T(10) = 1 + 2 + ... + 10 = 55

Given a list of words, convert each word to a number by summing the alphabetical values of its letters (A=1, B=2, C=3, ..., Z=26). Count how many words have triangular number values.

For example, the word "SKY" has value S(19) + K(11) + Y(25) = 55 = T(10), so it's a triangular word.

## Why This Matters

This problem combines string processing with number theory, introducing two important concepts:

**1. Character encoding and alphabetical values:**
Converting letters to numbers is fundamental to:
- Hash functions (mapping strings to numeric keys)
- Checksums and error detection codes
- Cryptographic algorithms
- Text analysis and natural language processing

**2. Testing triangular numbers:**
The naive approach generates all triangular numbers up to some limit. The elegant approach solves the quadratic equation n(n+1)/2 = x for n and checks if n is a positive integer.

From T(n) = n(n+1)/2 = x, we get:
- n² + n - 2x = 0
- Using the quadratic formula: n = (-1 + √(1 + 8x)) / 2

If this n is a positive integer, then x is triangular. This algebraic approach is more elegant than maintaining a set of triangular numbers and demonstrates how mathematical insight leads to cleaner solutions.

## Examples

**Example 1:**

- Input: `word = "SKY"`
- Output: `true`
- Explanation: S=19, K=11, Y=25, sum=55. Since T(10) = 55, "SKY" is a triangular word.

**Example 2:**

- Input: `word = "ABILITY"`
- Output: `true`
- Explanation: A=1, B=2, I=9, L=12, I=9, T=20, Y=25, sum=78. Since T(12) = 78, "ABILITY" is triangular.

**Example 3:**

- Input: `words = ["SKY", "ABILITY", "CODE"]`
- Output: `2`
- Explanation: SKY (55) and ABILITY (78) are triangular. CODE = 3+15+4+5 = 27, not triangular.

## Constraints

- Words contain only uppercase English letters (A-Z)
- Word length: 1 to 20 characters
- Maximum word value: 20 × 26 = 520 (20 Z's)

## Think About

1. How do you convert a letter to its alphabetical position (A=1, B=2, ...)?
2. What's the word value of "COMPUTER"?
3. How can you check if a number is triangular without generating all triangular numbers?
4. What's the mathematical relationship between x and n in T(n) = x?

---

## Approach Hints

<details>
<summary>Hint 1: Computing Word Values</summary>

Convert each character to its alphabetical position and sum:

**Python:**
```python
def word_value(word):
    return sum(ord(char) - ord('A') + 1 for char in word)

# Example: "SKY"
# S: ord('S') - ord('A') + 1 = 83 - 65 + 1 = 19
# K: ord('K') - ord('A') + 1 = 75 - 65 + 1 = 11
# Y: ord('Y') - ord('A') + 1 = 89 - 65 + 1 = 25
# Total: 19 + 11 + 25 = 55
```

**Alternative (using alphabet string):**
```python
alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
def word_value(word):
    return sum(alphabet.index(char) + 1 for char in word)
```

</details>

<details>
<summary>Hint 2: Testing Triangular Numbers</summary>

**Method 1: Generate triangular numbers**
```python
# Generate triangular numbers up to max possible word value
triangular = set()
n = 1
while True:
    t = n * (n + 1) // 2
    if t > 520:  # Max word value (20 Z's)
        break
    triangular.add(t)
    n += 1

def is_triangular(x):
    return x in triangular
```

**Method 2: Quadratic formula (more elegant)**
```python
import math

def is_triangular(x):
    # Solve n(n+1)/2 = x for n
    # n = (-1 + sqrt(1 + 8x)) / 2
    n = (-1 + math.sqrt(1 + 8 * x)) / 2
    return n == int(n) and n > 0
```

Method 2 is O(1) per check vs O(sqrt(x)) generation time for Method 1.

</details>

<details>
<summary>Hint 3: Complete Algorithm</summary>

```python
import math

def is_triangular(x):
    # Check if x = n(n+1)/2 for some positive integer n
    # Solving: n^2 + n - 2x = 0
    # n = (-1 + sqrt(1 + 8x)) / 2
    discriminant = 1 + 8 * x
    n = (-1 + math.sqrt(discriminant)) / 2
    return n == int(n) and n > 0

def word_value(word):
    return sum(ord(char) - ord('A') + 1 for char in word)

def count_triangular_words(words):
    count = 0
    for word in words:
        value = word_value(word)
        if is_triangular(value):
            count += 1
    return count
```

**Optimization:** Since discriminant must be a perfect square, you can check `int(sqrt(1 + 8x))^2 == 1 + 8x` first.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Generate Set | O(√M + N×W) | O(√M) | M=max value (520), N=words, W=avg length; precompute triangular set |
| Quadratic Formula | O(N × W) | O(1) | No precomputation, O(1) check per word |
| Optimal | O(N × W) | O(1) | Direct formula, minimal space |

**Breakdown:**
- N = number of words
- W = average word length
- M = maximum possible word value (≈520)

For each word:
- Compute value: O(W) to sum letters
- Check triangular: O(1) with quadratic formula

Total: O(N × W)

---

## Key Concept

**Triangular Number Testing**

Triangular numbers have the form T(n) = n(n+1)/2. To test if x is triangular, solve for n:

```
n(n+1)/2 = x
n² + n = 2x
n² + n - 2x = 0
```

Using the quadratic formula (a=1, b=1, c=-2x):
```
n = (-1 ± √(1 + 8x)) / 2
```

Since n must be positive:
```
n = (-1 + √(1 + 8x)) / 2
```

For x to be triangular, this n must be a positive integer.

**Key checks:**
1. Discriminant (1 + 8x) must be a perfect square
2. n must be a whole number (no fractional part)
3. n must be positive

**Example:**
Is 55 triangular?
- n = (-1 + √(1 + 8×55)) / 2 = (-1 + √441) / 2 = (-1 + 21) / 2 = 10 ✓
- Since n=10 is an integer, 55 = T(10) is triangular

Is 27 triangular?
- n = (-1 + √(1 + 8×27)) / 2 = (-1 + √217) / 2 ≈ 6.86 ✗
- Since n is not an integer, 27 is not triangular

---

## Common Mistakes

1. **Incorrect character conversion**: Using `ord(char)` directly instead of `ord(char) - ord('A') + 1`. 'A' should be 1, not 65.

2. **Floating-point precision**: When checking `n == int(n)`, floating-point errors might cause issues. Use `abs(n - round(n)) < 1e-9` for safer comparison.

3. **Negative discriminant**: For very small x (like 0), discriminant is always positive, but ensure your code handles edge cases.

4. **Forgetting to handle lowercase**: If input might have lowercase letters, convert to uppercase first: `word.upper()`.

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Case-insensitive | Allow lowercase letters | Convert word to uppercase before processing |
| Return the words | Output list of triangular words | Collect words instead of counting |
| Other figurate numbers | Pentagonal, hexagonal, etc. | Adjust formula: P(n) = n(3n-1)/2, H(n) = n(2n-1) |
| Maximum triangular word | Find word with highest triangular value | Track max value during iteration |
| Custom scoring | Different letter values | Modify word_value function |

---

## Practice Checklist

**Correctness:**

- [ ] Handles basic examples ("SKY" = 55, "ABILITY" = 78)
- [ ] Correctly computes word values
- [ ] Accurately tests triangular numbers
- [ ] Counts triangular words correctly

**Understanding:**

- [ ] Can explain the quadratic formula derivation
- [ ] Understands character encoding (ASCII values)
- [ ] Knows why algebraic approach is elegant
- [ ] Can compute triangular numbers manually

**Mastery:**

- [ ] Solved without hints
- [ ] Implemented both methods (set vs formula)
- [ ] Can explain to someone else
- [ ] Can handle variations (pentagonal, hexagonal)

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Derive quadratic formula from scratch
- [ ] Day 14: Implement variation (pentagonal numbers)

---

**Euler Reference:** [Problem 42](https://projecteuler.net/problem=42)

**Next Step:** After mastering this, try [F028: Self Powers](./F028_self_powers.md)
