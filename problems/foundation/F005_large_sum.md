---
id: F005
euler_id: 13
slug: large-sum
title: Large Sum
difficulty: foundation
topics: ["math", "big-integers", "strings"]
patterns: []
estimated_time_minutes: 15
prerequisites: ["programming-basics"]
---

# Large Sum

## Problem

Given a list of large numbers (each with many digits), find the first k digits of their sum. The numbers may be too large to fit in standard integer types.

For example, if you have numbers with 50 digits each, standard 64-bit integers can only hold about 19 digits. You need to handle arbitrary-precision arithmetic or use string manipulation techniques.

## Why This Matters

Many languages have arbitrary-precision integers (Python's `int`, Java's `BigInteger`) or require special handling for very large numbers. This problem teaches string manipulation for arithmetic and introduces the concept of numerical overflow. Understanding big integer arithmetic is essential for:

- **Cryptography**: RSA encryption uses numbers with hundreds or thousands of digits
- **Scientific computing**: High-precision calculations in physics and astronomy
- **Financial systems**: Exact decimal arithmetic for currency (avoiding floating-point errors)
- **Combinatorics**: Factorials and binomial coefficients grow extremely fast

## Examples

**Example 1:**

- Input: `numbers = [123456789, 987654321], k = 5`
- Output: `11111`
- Explanation: Sum = 123456789 + 987654321 = 1111111110. First 5 digits: 11111

**Example 2:**

- Input: `numbers = [37107287533902102798797998220837590246510135740250,
                      46376937677490009712648124896970078050417018260538], k = 10`
- Output: `8348422521`
- Explanation: Sum of these two 50-digit numbers, taking first 10 digits.

## Constraints

- Numbers can have up to 50 digits
- 1 <= k <= 15
- At least 1 number in the list

## Think About

1. What's the simplest approach that works?
2. Can you identify a mathematical pattern or formula?
3. What are the bounds of your search space?
4. How can you verify your answer?

---

## Approach Hints

<details>
<summary>Hint 1: Getting Started</summary>

In Python, integers have arbitrary precision - you can just sum normally! The language handles big numbers automatically.

```python
total = sum(numbers)  # Works regardless of size
result = str(total)[:k]  # Convert to string and take first k characters
```

In other languages without native big integer support, you'd need:
- BigInteger class (Java, C#)
- String addition (manual digit-by-digit addition with carry)
- External libraries (GMP in C/C++)

</details>

<details>
<summary>Hint 2: Key Insight</summary>

If numbers are provided as strings (common for very large numbers), you can either:

1. **Convert to integer**: If your language supports big integers, convert each string to an integer, sum them, convert back to string
2. **String arithmetic**: Implement addition character by character from right to left, handling carries

The string-to-int approach is simpler in languages with big integer support.

</details>

<details>
<summary>Hint 3: Optimization</summary>

**Python solution:**
```python
def first_k_digits_of_sum(numbers, k):
    total = sum(numbers)
    return str(total)[:k]
```

**Java solution:**
```java
BigInteger sum = BigInteger.ZERO;
for (String num : numbers) {
    sum = sum.add(new BigInteger(num));
}
String result = sum.toString().substring(0, k);
```

**Manual string addition** (if needed):
```python
def add_strings(a, b):
    # Pad to same length
    max_len = max(len(a), len(b))
    a = a.zfill(max_len)
    b = b.zfill(max_len)

    result = []
    carry = 0
    for i in range(max_len - 1, -1, -1):
        digit_sum = int(a[i]) + int(b[i]) + carry
        result.append(str(digit_sum % 10))
        carry = digit_sum // 10

    if carry:
        result.append(str(carry))

    return ''.join(reversed(result))
```

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Built-in big integers | O(n × d) | O(d) | Simple, relies on language features |
| String addition | O(n × d) | O(d) | Portable but more complex to implement |

Where n = number of values, d = digits per number.

---

## Key Concept

**Big integer handling**

Standard integer types have fixed sizes:
- 32-bit int: up to ~2 billion (10 digits)
- 64-bit long: up to ~9 × 10^18 (19 digits)

For larger numbers, we need:

1. **Arbitrary-precision integers**: Store numbers as arrays of digits or use base-2^32 representation
2. **Efficient algorithms**: Karatsuba multiplication, FFT-based multiplication for very large numbers
3. **Memory management**: Large numbers require more memory

**Python's int implementation:**
- Uses base 2^30 internally (for efficiency)
- Dynamically allocates more "digits" as needed
- Operations are slightly slower than fixed-size ints but handle any size

**Why take only first k digits?**
- Even if the full sum has 100 digits, we only need to compute accurately enough to get the first k
- However, carries can propagate, so we generally need to compute the full sum
- For the Euler problem, k=10 and numbers have 50 digits each, so the sum has at most 51 digits

---

## Common Mistakes

1. **Forgetting about carries**: When manually implementing string addition, carries can propagate all the way to the left. Don't forget the final carry!

2. **String indexing errors**: Remember that strings are indexed left-to-right, but addition proceeds right-to-left. Use `[::-1]` to reverse or index from the end.

3. **Leading zeros**: If you're building the result string, make sure you don't include unnecessary leading zeros (except for the number 0 itself).

4. **Truncating too early**: You can't just add the first k digits of each number to get the first k digits of the sum - carries can affect early digits.

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Last k digits | Find trailing digits instead | Use modulo: `sum % (10^k)`, then pad with zeros |
| Product instead of sum | Multiply large numbers | Use big integer multiplication |
| Floating point precision | Numbers with decimals | Use decimal libraries (e.g., Python's `decimal`) |

---

## Practice Checklist

**Correctness:**

- [ ] Handles basic cases (small numbers, k digits)
- [ ] Handles edge cases (k = 1, very large numbers)
- [ ] Produces correct output format

**Understanding:**

- [ ] Can explain the mathematical insight
- [ ] Understands why the approach works
- [ ] Can estimate complexity without running code

**Mastery:**

- [ ] Solved without hints
- [ ] Can explain to someone else
- [ ] Identified optimization opportunities

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Explain the concept
- [ ] Day 14: Optimize if possible

---

**Euler Reference:** [Problem 13](https://projecteuler.net/problem=13)

**Next Step:** After mastering this, try [F006: Power Digit Sum](./F006_power_digit_sum.md) for more big integer practice!
