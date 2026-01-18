---
id: F002
euler_id: 2
slug: even-fibonacci-numbers
title: Even Fibonacci Numbers
difficulty: foundation
topics: ["math", "sequences", "fibonacci"]
patterns: []
estimated_time_minutes: 10
prerequisites: ["programming-basics"]
---

# Even Fibonacci Numbers

## Problem

Find the sum of all even-valued Fibonacci numbers that do not exceed a given limit. The Fibonacci sequence starts 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ... where each number is the sum of the two preceding ones.

For example, if the limit is 10, the Fibonacci sequence up to 10 is: 1, 2, 3, 5, 8. The even values are 2 and 8, so the sum is 10.

## Why This Matters

The Fibonacci sequence appears throughout computer science and mathematics: in algorithm analysis (Fibonacci heap), nature (spiral patterns), and optimization (Fibonacci search). This problem teaches sequence generation, conditional filtering, and early termination. Understanding how to generate sequences on-the-fly (rather than storing all values) is a key efficiency technique.

The pattern here also introduces an important observation: every third Fibonacci number is even. This pattern recognition can lead to a 3x speedup by only generating every third number.

## Examples

**Example 1:**

- Input: `limit = 10`
- Output: `10`
- Explanation: Fibonacci numbers ≤ 10 are: 1, 2, 3, 5, 8. Even values: 2, 8. Sum = 2 + 8 = 10.

**Example 2:**

- Input: `limit = 100`
- Output: `44`
- Explanation: Even Fibonacci numbers ≤ 100 are: 2, 8, 34. Sum = 2 + 8 + 34 = 44.

## Constraints

- 1 <= limit <= 4 × 10^6

## Think About

1. What's the simplest approach that works?
2. Can you identify a mathematical pattern or formula?
3. What are the bounds of your search space?
4. How can you verify your answer?

---

## Approach Hints

<details>
<summary>Hint 1: Getting Started</summary>

Generate Fibonacci numbers one at a time using the formula: F(n) = F(n-1) + F(n-2), starting with F(1) = 1 and F(2) = 2.

For each Fibonacci number you generate:
1. Check if it exceeds the limit (if so, stop)
2. Check if it's even (use `num % 2 == 0`)
3. If even, add it to your running sum

You only need to track the last two Fibonacci numbers, not the entire sequence!

</details>

<details>
<summary>Hint 2: Key Insight</summary>

Notice a pattern: in the Fibonacci sequence, every third number is even!
- 1 (odd), 2 (even), 3 (odd), 5 (odd), 8 (even), 13 (odd), 21 (odd), 34 (even)...

This happens because:
- odd + odd = even
- odd + even = odd
- even + odd = odd
- Then the cycle repeats

You can optimize by only generating every third Fibonacci number using the recurrence: E(n) = 4×E(n-1) + E(n-2), where E represents even Fibonacci numbers.

</details>

<details>
<summary>Hint 3: Optimization</summary>

**Simple approach** (generate all, filter evens):
```
a, b = 1, 2
sum = 0
while b <= limit:
    if b % 2 == 0:
        sum += b
    a, b = b, a + b
return sum
```

**Optimized approach** (generate only evens):
```
e1, e2 = 2, 8  # First two even Fibonacci numbers
sum = e1 if limit >= 2 else 0
if limit >= e2:
    sum += e2
    while True:
        next_even = 4 * e2 + e1
        if next_even > limit:
            break
        sum += next_even
        e1, e2 = e2, next_even
return sum
```

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Generate all Fibonacci | O(log(limit)) | O(1) | Simple, checks parity for each number |
| Generate even only | O(log(limit)) | O(1) | 3x faster, slightly more complex |

Note: Time is O(log n) because Fibonacci grows exponentially (~φ^n where φ ≈ 1.618), so only about log(limit) numbers exist below the limit.

---

## Key Concept

**Sequence generation with early termination**

Generating sequences on-the-fly using iterative computation is more memory-efficient than storing entire sequences. The key insight is maintaining only the state needed for the next iteration (in this case, the last two numbers).

Early termination saves computation: stop as soon as you know no future elements will satisfy the constraints. Since Fibonacci grows exponentially, you'll generate very few numbers even for large limits (only about 30 numbers for limit = 4 million).

**Fibonacci growth rate:** F(n) ≈ φ^n / √5, where φ = (1 + √5)/2 ≈ 1.618 (the golden ratio). This exponential growth explains why we only need logarithmic iterations.

---

## Common Mistakes

1. **Starting with wrong values**: The problem states the sequence starts 1, 2, 3, 5, 8... Don't start with 0, 1 unless explicitly stated.

2. **Checking all numbers instead of just evens**: For better efficiency, recognize the pattern and generate only even Fibonacci numbers.

3. **Storing entire sequence**: You only need the last two values to compute the next one. Don't use an array to store all Fibonacci numbers.

4. **Off-by-one error with limit**: Include Fibonacci numbers equal to the limit, not just less than it (unless problem says otherwise).

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Sum of odd Fibonacci | Filter for odd instead | Check `num % 2 == 1`, or skip every third |
| Sum of divisible by k | Different filter condition | Check `num % k == 0` |
| Nth Fibonacci number | Find specific position | Count iterations instead of checking limit |
| Sum all Fibonacci | No filtering | Remove the even check |

---

## Practice Checklist

**Correctness:**

- [ ] Handles basic cases (limit = 10, 100)
- [ ] Handles edge cases (limit = 1, limit = 4000000)
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

**Euler Reference:** [Problem 2](https://projecteuler.net/problem=2)

**Next Step:** After mastering this, try [F003: Smallest Multiple](./F003_smallest_multiple.md)
