---
id: F020
slug: digital-root
title: Digital Root
difficulty: foundation
topics: ["math", "digit-manipulation", "modular-arithmetic"]
patterns: []
estimated_time_minutes: 10
prerequisites: ["programming-basics"]
---

# Digital Root

## Problem

The **digital root** of a positive integer is found by repeatedly summing its digits until only a single digit remains.

**Process:**
1. Sum all digits of the number
2. If the result has more than one digit, repeat step 1
3. The final single digit is the digital root

Given a non-negative integer n, find its digital root.

**Example walkthrough:**
- Start: 9875
- Step 1: 9 + 8 + 7 + 5 = 29 (more than one digit)
- Step 2: 2 + 9 = 11 (more than one digit)
- Step 3: 1 + 1 = 2 (single digit)
- Digital root: 2

## Why This Matters

The digital root connects to fundamental concepts in number theory and has practical applications:

**1. Casting Out Nines**: Digital root is equivalent to n mod 9 (with adjustment for multiples of 9). This ancient technique was used to verify arithmetic calculations before calculators.

**2. Divisibility Testing**:
- A number is divisible by 3 if its digital root is 3, 6, or 9
- A number is divisible by 9 if its digital root is 9
- This works because 10 ≡ 1 (mod 9)

**3. Pattern Recognition**: Digital roots reveal hidden patterns in sequences:
- Fibonacci sequence digital roots: 1, 1, 2, 3, 5, 8, 4, 3, 7, 1, 8, 9, 8, 8, 7, 6, 4, 1, 5, 6, 2, 8, 1, 9... (period 24)
- Powers of 2: 2, 4, 8, 7, 5, 1, 2, 4, 8, 7... (period 6)

**4. O(1) Formula**: While iteration seems necessary, there's a direct mathematical formula—a great example of how number theory can replace loops.

**5. Interview Signal**: This problem tests whether candidates can recognize modular arithmetic patterns and avoid brute force when a formula exists.

## Examples

**Example 1:**

- Input: `38`
- Output: `2`
- Explanation: 3 + 8 = 11, then 1 + 1 = 2

**Example 2:**

- Input: `0`
- Output: `0`
- Explanation: 0 is already a single digit

**Example 3:**

- Input: `9`
- Output: `9`
- Explanation: 9 is already a single digit

**Example 4:**

- Input: `123456789`
- Output: `9`
- Explanation: 1+2+3+4+5+6+7+8+9 = 45, then 4+5 = 9

## Constraints

- 0 <= n <= 2^31 - 1
- Follow-up: Can you solve it in O(1) time without loops or recursion?

## Think About

1. What's the relationship between a number and the sum of its digits?
2. What happens when you take any number mod 9?
3. Why does the iterative process always terminate?
4. Is there a pattern for numbers divisible by 9?

---

## Approach Hints

<details>
<summary>Hint 1: Iterative Digit Sum</summary>

**Direct simulation:**

```
digit_sum(n):
    sum = 0
    while n > 0:
        sum += n mod 10
        n = n / 10  # integer division
    return sum

digital_root(n):
    while n >= 10:  # while more than one digit
        n = digit_sum(n)
    return n
```

**Example: n = 9875**
- digit_sum(9875) = 29
- digit_sum(29) = 11
- digit_sum(11) = 2
- Return 2

**Time complexity**: O(log n) iterations, each iteration O(log n) to sum digits.
Total: O((log n)²) — but the inner sum gets smaller quickly.

**Space complexity**: O(1)

</details>

<details>
<summary>Hint 2: The Mod 9 Connection</summary>

**Key insight**: Digital root is deeply connected to modulo 9.

**Mathematical fact**: For any positive integer n:
- n ≡ (sum of digits of n) (mod 9)

**Why?** Because 10 ≡ 1 (mod 9), so:
- 10^k ≡ 1^k = 1 (mod 9)
- A number abc = a×100 + b×10 + c ≡ a + b + c (mod 9)

**This means:**
- 9875 ≡ 9 + 8 + 7 + 5 ≡ 29 ≡ 2 + 9 ≡ 11 ≡ 2 (mod 9)
- Since 2 < 9, the digital root is 2

**The pattern:**
- If n mod 9 = 0 and n > 0, digital root = 9
- Otherwise, digital root = n mod 9

**Why the special case for 9?**
- Digital root is always 1-9 (never 0 for positive numbers)
- But n mod 9 gives 0-8
- When n mod 9 = 0 and n ≠ 0, the digital root is 9, not 0

</details>

<details>
<summary>Hint 3: The O(1) Formula</summary>

**Direct formula:**

```
digital_root(n):
    if n == 0:
        return 0
    elif n mod 9 == 0:
        return 9
    else:
        return n mod 9
```

**Elegant one-liner** (for n > 0):
```
digital_root(n) = 1 + (n - 1) mod 9
```

**Why this works:**
- Maps n=1 → 1, n=2 → 2, ..., n=9 → 9, n=10 → 1, ...
- Subtracting 1 shifts the range, mod 9 wraps, adding 1 shifts back
- Handles the 9 → 9 case correctly (not 9 → 0)

**Complete O(1) solution:**
```
digital_root(n):
    if n == 0:
        return 0
    return 1 + (n - 1) mod 9
```

**Time complexity**: O(1)
**Space complexity**: O(1)

</details>

---

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Iterative digit sum | O((log n)²) | O(1) | Practical, but not optimal |
| Recursive | O((log n)²) | O(log n) | Same time, worse space |
| Formula (mod 9) | O(1) | O(1) | Optimal |

**Why iterative is still O((log n)²):**
- First sum: at most log₁₀(n) digits
- Each subsequent sum reduces magnitude significantly
- Total work dominated by first iteration

---

## Key Concept

**Congruence and Digit Sums**

**The fundamental theorem:**

A number n is congruent to the sum of its digits, modulo 9.

**Proof:**
Any integer can be written in decimal as:
n = aₖ × 10^k + aₖ₋₁ × 10^(k-1) + ... + a₁ × 10 + a₀

Since 10 ≡ 1 (mod 9):
- 10^k ≡ 1^k = 1 (mod 9) for all k

Therefore:
n ≡ aₖ × 1 + aₖ₋₁ × 1 + ... + a₁ × 1 + a₀ × 1 (mod 9)
n ≡ aₖ + aₖ₋₁ + ... + a₁ + a₀ (mod 9)
n ≡ (sum of digits) (mod 9)

**Applications:**
1. **Divisibility by 9**: n divisible by 9 ⟺ digit sum divisible by 9
2. **Divisibility by 3**: n divisible by 3 ⟺ digit sum divisible by 3
3. **Casting out nines**: Quick check for arithmetic errors

**Generalization:**
For base b, similar rules apply for divisibility by (b-1).
- Base 10: divisibility by 9 via digit sum
- Base 16: divisibility by 15 via digit sum
- Base 2: divisibility by 1 (trivial—every number is divisible by 1)

---

## Common Mistakes

1. **Forgetting n = 0 case**: Digital root of 0 is 0, but the formula 1 + (n-1) mod 9 doesn't work for n = 0.

2. **Returning 0 instead of 9**: When n mod 9 = 0 and n > 0, the digital root is 9, not 0. The one-liner formula handles this.

3. **Inefficient iteration**: Repeatedly converting to string and back is slow. Use mod 10 and integer division.

4. **Overflow concerns**: For very large numbers (strings), you can compute digit sum directly without converting to int, since the sum will be manageable.

5. **Confusing with digit sum**: Digital root continues until single digit; digit sum might stop earlier.

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Digital root in base b | Use base b digits | 1 + (n - 1) mod (b - 1) |
| Multiplicative digital root | Multiply digits instead | No simple formula; must iterate |
| Additive persistence | Count iterations to reach root | Must iterate; track count |
| Sum of digits | Just one sum, not to single digit | O(log n) digit extraction |
| Digital root of very large number | n given as string | Sum digits directly from string |

**Additive persistence example:**
- 9875 → 29 → 11 → 2 (persistence = 3)
- The smallest number with persistence 4 is 19999999999999999999999 (23 digits)

---

## Practice Checklist

**Correctness:**

- [ ] Handles n = 0
- [ ] Handles single-digit numbers (1-9)
- [ ] Handles multiples of 9 correctly
- [ ] Handles large numbers (2^31 - 1)

**Understanding:**

- [ ] Can explain why n ≡ digit_sum(n) (mod 9)
- [ ] Understands the special case for multiples of 9
- [ ] Can derive the O(1) formula
- [ ] Knows why 10 ≡ 1 (mod 9) matters

**Mastery:**

- [ ] Solved without hints
- [ ] Implemented O(1) solution
- [ ] Can extend to other bases
- [ ] Can explain connection to divisibility rules

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Derive formula without hints
- [ ] Day 7: Explain mod 9 connection
- [ ] Day 14: Solve additive persistence variation

---

**Next Step:** After mastering this, try [F021: Happy Numbers](./F021_happy_numbers.md)
