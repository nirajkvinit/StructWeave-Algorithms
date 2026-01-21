---
id: F026
euler_id: 40
slug: champernownes-constant
title: Champernowne's Constant
difficulty: foundation
topics: ["math", "strings", "indexing"]
patterns: []
estimated_time_minutes: 15
prerequisites: ["programming-basics"]
---

# Champernowne's Constant

## Problem

Champernowne's constant is an irrational number formed by concatenating all positive integers in order:

0.123456789**10**1112131415161718192021...

If we denote the nth digit of this fractional part as d(n), then:
- d(1) = 1
- d(2) = 2
- d(10) = 1 (the first digit of 10)
- d(11) = 0 (the second digit of 10)
- d(12) = 1 (the first digit of 11)

Your task is to find the product d(1) × d(10) × d(100) × d(1000) × d(10000) × d(100000) × d(1000000).

In other words, find specific digits at positions 1, 10, 100, 1000, 10000, 100000, and 1000000 in the infinite decimal string, then multiply them together.

## Why This Matters

This problem teaches efficient indexing and mathematical reasoning without constructing massive data structures. Building a million-character string wastes memory when we only need specific digits.

The key insight: numbers with different digit counts occupy predictable ranges:
- 1-digit numbers (1-9): 9 numbers × 1 digit = 9 positions
- 2-digit numbers (10-99): 90 numbers × 2 digits = 180 positions
- 3-digit numbers (100-999): 900 numbers × 3 digits = 2700 positions
- k-digit numbers: 9×10^(k-1) numbers × k digits each

This structure enables O(log n) lookup: determine which digit-count range contains position n, identify the specific number, then extract the digit. This transforms an O(n) string construction into O(log n) arithmetic.

Such indexing patterns appear in:
- **Databases**: B-tree indexing for efficient lookups
- **File Systems**: Finding blocks in large files without reading everything
- **Streaming Algorithms**: Processing infinite data with limited memory

## Examples

**Example 1:**

- Input: `positions = [1, 10, 100]`
- Output: `1 × 1 × 5 = 5`
- Explanation:
  - d(1) = 1 (first digit is from "1")
  - d(10) = 1 (position 10 is the first digit of "10")
  - d(100) = 5 (position 100 falls in "55", first digit)

**Example 2:**

- Input: `position = 12`
- Output: `1`
- Explanation: Sequence is "123456789101112...", 12th digit is the "1" from "11"

**Example 3:**

- Input: `positions = [1, 10, 100, 1000, 10000, 100000, 1000000]`
- Output: `210` (product of all seven digits)

## Constraints

- Positions can be up to 1,000,000
- Digit values are 0-9
- Positions are 1-indexed (first digit is position 1)

## Think About

1. How many positions do 1-digit numbers occupy? 2-digit? 3-digit?
2. Given position n, which number contains it?
3. Which specific digit within that number?
4. Can you avoid building the entire string?

---

## Approach Hints

<details>
<summary>Hint 1: Count Digits by Range</summary>

Break the sequence into ranges by digit count:

| Range | Numbers | Count | Digits Each | Total Positions | Cumulative |
|-------|---------|-------|-------------|-----------------|------------|
| 1-digit | 1-9 | 9 | 1 | 9 | 9 |
| 2-digit | 10-99 | 90 | 2 | 180 | 189 |
| 3-digit | 100-999 | 900 | 3 | 2700 | 2889 |
| 4-digit | 1000-9999 | 9000 | 4 | 36000 | 38889 |
| k-digit | 10^(k-1) to 10^k-1 | 9×10^(k-1) | k | k×9×10^(k-1) | ... |

For position n, find which range contains it by checking cumulative totals.

</details>

<details>
<summary>Hint 2: Locate the Number</summary>

Once you know position n is in the k-digit range:

1. **Subtract positions from previous ranges** to get offset within this range
2. **Divide offset by k** to find which k-digit number (0-indexed within range)
3. **Find the actual number**: first k-digit number is 10^(k-1), so number = 10^(k-1) + (offset // k)
4. **Find digit within the number**: digit_index = offset % k

Example: Find d(15)
- Position 15 is beyond 1-digit range (9 positions)
- Offset in 2-digit range: 15 - 9 = 6
- Which 2-digit number: 6 // 2 = 3 (0-indexed, so 3rd 2-digit number)
- Actual number: 10 + 3 = 13
- Digit index within 13: 6 % 2 = 0 (first digit)
- Answer: "13"[0] = 1

</details>

<details>
<summary>Hint 3: Complete Algorithm</summary>

```python
def find_digit(n):
    digits = 1  # Start with 1-digit numbers
    count = 9   # Count of numbers with 'digits' digits
    start = 1   # First number with 'digits' digits

    # Find which digit range contains position n
    while n > digits * count:
        n -= digits * count
        digits += 1
        count *= 10
        start *= 10

    # n is now the offset within the current digit range
    # Find which number
    number = start + (n - 1) // digits

    # Find which digit within that number
    digit_index = (n - 1) % digits

    # Extract the digit
    return int(str(number)[digit_index])

# For the problem
result = 1
for pos in [1, 10, 100, 1000, 10000, 100000, 1000000]:
    result *= find_digit(pos)
return result
```

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Build String | O(n) | O(n) | Construct entire string up to position n |
| Direct Calculation | O(log n) | O(log n) | Calculate position mathematically |
| Precompute Ranges | O(1) per query | O(log n) | After O(log n) setup |

**Why Direct Calculation Wins:**

- No string construction required
- Each digit lookup is O(log n) - only depends on number of digit ranges (~6 for n=1,000,000)
- Space usage: O(log n) for storing the target number
- For 7 queries: 7 × O(log n) << O(n) for large n

---

## Key Concept

**Digit Counting and Efficient Indexing**

The structure of Champernowne's constant allows mathematical indexing:

**Step 1: Range Identification**
- 1-digit numbers: positions 1-9 (9 total)
- 2-digit numbers: positions 10-189 (180 total)
- 3-digit numbers: positions 190-2889 (2700 total)
- ...

**Step 2: Offset Calculation**
Within the k-digit range, each number contributes k digits.
- Offset within range tells us how far into the range we are
- Dividing by k gives the number index
- Modulo k gives the digit index within that number

**Step 3: Digit Extraction**
Convert the number to string and extract the digit at the calculated index.

**General Formula:**
For k-digit numbers:
- Count: 9 × 10^(k-1)
- Total positions: k × 9 × 10^(k-1)
- First number: 10^(k-1)

This pattern of mathematical indexing avoids expensive data structure construction and enables efficient lookup in conceptually infinite sequences.

---

## Common Mistakes

1. **Building the entire string**: For n=1,000,000, this requires concatenating numbers 1-185,186. Wasteful when you only need 7 digits.

2. **Off-by-one errors**: Positions are 1-indexed. Subtracting 1 when computing offsets and indices is critical.

3. **Integer division errors**: Using `/` instead of `//` in Python, or not handling division correctly in other languages.

4. **Not handling single digits**: When n <= 9, the answer is simply n itself (d(5) = 5).

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Different positions | Find d(k) for arbitrary k | Same algorithm, different input |
| Sum instead of product | Add digits instead | Change operation in final step |
| Find all digits in range | Get d(a) through d(b) | Loop through range, compute each |
| Generalized constant | Concatenate odd numbers only | Adjust counting formula |
| Reverse order | Concatenate backwards | Start from large numbers |

---

## Practice Checklist

**Correctness:**

- [ ] Handles small positions (d(1) = 1, d(10) = 1)
- [ ] Handles large positions (d(1000000))
- [ ] Correctly identifies digit ranges
- [ ] Produces correct product (210)

**Understanding:**

- [ ] Can explain why building the string is inefficient
- [ ] Understands the digit counting formula
- [ ] Can derive the range boundaries
- [ ] Knows the time complexity (O(log n))

**Mastery:**

- [ ] Solved without hints
- [ ] Can explain the indexing logic to someone else
- [ ] Can handle variations (sum, different positions)
- [ ] Identified optimization (avoid string construction)

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Explain digit counting formula
- [ ] Day 14: Implement variation (sum of digits)

---

**Euler Reference:** [Problem 40](https://projecteuler.net/problem=40)

**Next Step:** After mastering this, try [F027: Coded Triangle Numbers](./F027_coded_triangle_numbers.md)
