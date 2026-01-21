---
id: F003
slug: collatz-conjecture
title: Collatz Conjecture
difficulty: foundation
topics: ["math", "sequences", "iteration"]
patterns: []
estimated_time_minutes: 12
prerequisites: ["programming-basics"]
---

# Collatz Conjecture

## Problem

The **Collatz sequence** (also known as the 3n+1 problem or hailstone sequence) is defined for positive integers as follows:

- If n is even: next term = n / 2
- If n is odd: next term = 3n + 1

Starting from any positive integer, repeatedly apply these rules. The **Collatz conjecture** states that this sequence always eventually reaches 1.

**Example: Starting from 13**
```
13 → 40 → 20 → 10 → 5 → 16 → 8 → 4 → 2 → 1
```

Given a positive integer n, compute:
1. The complete Collatz sequence starting from n until it reaches 1
2. The **stopping time**: the number of steps to reach 1

## Why This Matters

The Collatz conjecture is one of mathematics' most famous unsolved problems, yet it's simple enough for anyone to understand:

**1. Unsolved for 90+ Years**: Despite being studied since 1937 and verified for numbers up to 2^68, no one has proven it always reaches 1. Paul Erdős said: "Mathematics may not be ready for such problems."

**2. Computational Thinking**: This problem teaches:
- Sequence generation through iterative rules
- Stopping conditions (when to terminate)
- Pattern recognition in chaotic-looking data
- Memoization for optimization

**3. Surprising Behavior**: The sequences behave chaotically:
- Small starting numbers can produce long sequences (27 takes 111 steps)
- Consecutive numbers can have vastly different stopping times
- The maximum value reached can be much larger than the starting value

**4. Real Applications**: The iteration pattern appears in:
- Algorithm termination analysis
- Dynamical systems
- Random number generator testing

**5. Interview Context**: Tests basic loop control, conditional logic, and ability to handle sequences with unpredictable lengths.

## Examples

**Example 1:**

- Input: `n = 6`
- Output:
  - Sequence: `[6, 3, 10, 5, 16, 8, 4, 2, 1]`
  - Stopping time: `8`
- Explanation: 6→3 (6/2), 3→10 (3×3+1), 10→5, 5→16, 16→8, 8→4, 4→2, 2→1

**Example 2:**

- Input: `n = 1`
- Output:
  - Sequence: `[1]`
  - Stopping time: `0`
- Explanation: Already at 1, no steps needed

**Example 3:**

- Input: `n = 27`
- Output:
  - Stopping time: `111`
  - Max value in sequence: `9232`
- Explanation: This small starting number has a surprisingly long sequence

## Constraints

- 1 <= n <= 10^6
- The sequence is guaranteed to reach 1 (per the conjecture, unproven but verified for all inputs in this range)
- Return the stopping time (number of steps to reach 1)

## Think About

1. How do you implement the two rules (even and odd cases)?
2. When should the loop terminate?
3. How can you track the number of steps?
4. What happens to the sequence length as starting numbers increase?

---

## Approach Hints

<details>
<summary>Hint 1: Basic Sequence Generation</summary>

**Direct implementation:**

```
collatz_sequence(n):
    sequence = [n]
    while n != 1:
        if n is even:
            n = n / 2
        else:
            n = 3 * n + 1
        sequence.append(n)
    return sequence

stopping_time(n):
    steps = 0
    while n != 1:
        if n is even:
            n = n / 2
        else:
            n = 3 * n + 1
        steps += 1
    return steps
```

**Testing divisibility by 2:**
- `n % 2 == 0` means n is even
- `n & 1 == 0` is a faster bitwise check

**Example trace for n = 6:**
```
n=6 (even) → 3, steps=1
n=3 (odd) → 10, steps=2
n=10 (even) → 5, steps=3
n=5 (odd) → 16, steps=4
n=16 (even) → 8, steps=5
n=8 (even) → 4, steps=6
n=4 (even) → 2, steps=7
n=2 (even) → 1, steps=8
```

</details>

<details>
<summary>Hint 2: Optimization with Memoization</summary>

**Observation**: When computing stopping times for many numbers, sequences often overlap.

For example:
- 6 → 3 → 10 → 5 → 16 → 8 → 4 → 2 → 1
- 5 → 16 → 8 → 4 → 2 → 1

Once we know stopping_time(5) = 5, we can use it when computing stopping_time(6).

**Memoized approach:**

```
cache = {}  # Maps n → stopping time

stopping_time_memo(n):
    if n == 1:
        return 0
    if n in cache:
        return cache[n]

    if n is even:
        result = 1 + stopping_time_memo(n / 2)
    else:
        result = 1 + stopping_time_memo(3 * n + 1)

    cache[n] = result
    return result
```

**For finding the longest sequence under N:**

```
def longest_under_n(N):
    max_length = 0
    max_start = 1
    for i from 1 to N-1:
        length = stopping_time_memo(i)
        if length > max_length:
            max_length = length
            max_start = i
    return max_start, max_length
```

</details>

<details>
<summary>Hint 3: Shortcut for Odd Numbers</summary>

**Observation**: When n is odd, the next two steps are predictable:
1. n → 3n + 1 (which is even, since 3×odd + 1 = even)
2. 3n + 1 → (3n + 1) / 2

**Shortcut**: For odd n, jump directly to (3n + 1) / 2 and count 2 steps.

```
stopping_time_optimized(n):
    steps = 0
    while n != 1:
        if n is even:
            n = n / 2
            steps += 1
        else:
            n = (3 * n + 1) / 2
            steps += 2
    return steps
```

**Further optimization**: Count trailing zeros to handle multiple divisions at once:

```
while n != 1:
    if n is odd:
        n = 3 * n + 1
    # n is now even; divide by 2 until odd
    zeros = count_trailing_zeros(n)  # bitwise operation
    n = n >> zeros  # equivalent to n / 2^zeros
    steps += zeros + (1 if we did 3n+1 else 0)
```

**Note**: These optimizations matter for very large numbers or when computing many sequences.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Simple iteration | O(S) | O(1) | S = stopping time; unpredictable |
| Store sequence | O(S) | O(S) | If you need the full sequence |
| Memoized (many queries) | O(N × avg_S) | O(N) | Amortized benefit from caching |

**Why time is hard to analyze:**
- Stopping time S(n) is highly irregular
- Average stopping time for n is approximately 6.95 × log₂(n)
- But individual values vary wildly

**Known facts:**
- S(27) = 111, but S(26) = 10 and S(28) = 18
- Maximum value in sequence can exceed starting value significantly

---

## Key Concept

**Sequence Generation and Termination**

**Core pattern**: Generate sequence by iteratively applying a rule until a stopping condition is met.

```
generate_sequence(start, rule, stop_condition):
    current = start
    while not stop_condition(current):
        current = rule(current)
```

**The Collatz rule** is a piecewise function:
```
f(n) = n/2      if n is even
f(n) = 3n+1     if n is odd
```

**Termination**:
- Unlike most algorithmic sequences, Collatz termination is not proven
- In practice (for verified ranges), sequences do terminate
- This highlights the difference between "works in practice" and "proven to work"

**Chaotic behavior**: Small changes in input cause large changes in output:
- S(26) = 10
- S(27) = 111 (11× longer!)
- This sensitivity is characteristic of chaotic systems

**Connection to algorithm analysis**: Many algorithms have "chaotic" running times:
- Quicksort with random pivots
- Hash table operations with collisions
- We analyze average case, not predict individual cases

---

## Common Mistakes

1. **Integer overflow**: 3n+1 can get very large before coming back down. For n up to 10^6, intermediate values can exceed 10^9. Use 64-bit integers.

2. **Forgetting n=1 base case**: stopping_time(1) = 0, not 1.

3. **Infinite loop without conjecture guarantee**: The problem states the conjecture is assumed true. Don't add arbitrary iteration limits that might cut off valid sequences.

4. **Off-by-one in stopping time**: Clarify whether stopping time counts the initial value or not. Typically, it's the number of steps (transitions) to reach 1.

5. **Inefficient multiple queries**: If computing stopping time for many values, use memoization. The sequences overlap significantly.

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Longest sequence under N | Find starting value with max stopping time | Iterate 1 to N-1 with memoization |
| Maximum value in sequence | Track peak value reached | Update max during iteration |
| Generalized Collatz | Different multiplier/addend | Same structure, different constants |
| Count numbers reaching X first | How many sequences pass through X | Reverse Collatz: find predecessors |
| Stopping time distribution | Histogram of stopping times | Compute for range, analyze |

**The "longest sequence" variant** (inspired by Project Euler Problem 14):
Which starting number under 1,000,000 produces the longest Collatz sequence?
Answer: 837799 with a stopping time of 524.

---

## Practice Checklist

**Correctness:**

- [ ] Handles n = 1 (stopping time 0)
- [ ] Handles even starting numbers
- [ ] Handles odd starting numbers
- [ ] No integer overflow for n up to 10^6

**Understanding:**

- [ ] Can trace through sequence by hand
- [ ] Understands why memoization helps
- [ ] Knows the conjecture is unproven
- [ ] Can identify even/odd efficiently

**Mastery:**

- [ ] Solved without hints
- [ ] Implemented memoized version
- [ ] Found longest sequence under 10^6
- [ ] Can explain chaotic behavior

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Implement memoized version
- [ ] Day 7: Find longest sequence under N
- [ ] Day 14: Explain Collatz to someone

---

**Next Step:** After mastering this, try [F004: Even Fibonacci Numbers](./F004_even_fibonacci_numbers.md)
