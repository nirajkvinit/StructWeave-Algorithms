---
id: M307
old_id: A117
slug: 2-keys-keyboard
title: 2 Keys Keyboard
difficulty: medium
category: medium
topics: ["string", "math", "dynamic-programming"]
patterns: ["dynamic-programming", "math"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M650", "M651", "M991"]
prerequisites: ["E509", "E070"]
---
# 2 Keys Keyboard

## Problem

Imagine a text editor starting with a single character `'A'` displayed on the screen. You have access to exactly two operations:

- **Copy All**: Copies the entire current screen content to the clipboard (you cannot copy just part of the text - it's all or nothing)
- **Paste**: Appends whatever is currently in the clipboard to the screen content

Given an integer `n`, find the minimum number of operations needed to display exactly `n` copies of the letter `'A'` on the screen.

For example, to get 3 A's starting from 1 A: you could Copy All (now clipboard has "A"), then Paste (screen shows "AA"), then Paste again (screen shows "AAA") - that's 3 operations total. To get 6 A's, you might get 3 A's first (3 operations), then Copy All (clipboard has "AAA"), then Paste once (screen shows "AAAAAA") - that's 5 operations total.

The challenge is finding the optimal sequence. Sometimes it's better to copy early and paste multiple times; other times you should build up to an intermediate value, copy that, and paste. The key insight involves factorization: the optimal strategy relates to how you can express `n` as a product of factors.

## Why This Matters

This problem teaches you to recognize mathematical patterns hidden in seemingly procedural problems. The solution elegantly connects to prime factorization - a fundamental concept in number theory used in cryptography, hashing, and algorithm optimization. The insight that "minimum operations equals sum of prime factors" demonstrates how mathematical abstraction can simplify complex decision-making. This pattern of finding mathematical structure in operational problems appears in compiler optimization (strength reduction), resource scheduling, and dynamic programming state transitions. Learning to see both the DP formulation and the mathematical shortcut builds versatility in problem-solving approaches.

## Examples

**Example 1:**
- Input: `n = 3`
- Output: `3`
- Explanation: Initially, we have one character 'A'.
In step 1, we use Copy All operation.
In step 2, we use Paste operation to get 'AA'.
In step 3, we use Paste operation to get 'AAA'.

**Example 2:**
- Input: `n = 1`
- Output: `0`

## Constraints

- 1 <= n <= 1000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Recognize the Prime Factorization Pattern</summary>

The key insight is that reaching `n` characters optimally involves factorizing `n`.

Think about the operations:
- To get from `k` to `k×m` characters, you need: 1 Copy All + (m-1) Paste operations = m total operations
- For example: 1 'A' → 3 'A's requires Copy + Paste + Paste = 3 operations

To build `n` characters, you can break it down into factors:
- If `n = a × b`, you can first build `a` characters, then copy and paste to get `a×b`
- Total operations = (operations to get `a`) + (b operations to multiply by `b`)

The minimum operations equals the sum of prime factors of `n`.

</details>

<details>
<summary>Hint 2: Dynamic Programming Approach</summary>

Define `dp[i]` = minimum operations to get `i` characters.

Base case: `dp[1] = 0` (start with 1 'A')

For each `i` from 2 to n:
- Try all divisors `j` of `i`
- If `j` divides `i`, we can get `i` from `j` by copying once and pasting `(i/j - 1)` times
- `dp[i] = min(dp[j] + i/j)` for all divisors `j` of `i`

Example for n=6:
- dp[6] could come from:
  - dp[1] + 6 = 0 + 6 = 6 (copy from 1, paste 5 times)
  - dp[2] + 3 = 3 + 3 = 6 (copy from 2, paste 2 times)
  - dp[3] + 2 = 3 + 2 = 5 (copy from 3, paste 1 time) ← minimum

Time: O(n√n) to find all divisors, Space: O(n)

</details>

<details>
<summary>Hint 3: Mathematical Optimization - Sum of Prime Factors</summary>

The most elegant solution: the minimum operations equals the sum of all prime factors (with repetition).

**Why?**
- For a prime `p`, you need `p` operations (1 copy + p-1 pastes)
- For a composite `n = p₁^a₁ × p₂^a₂ × ... × pₖ^aₖ`, the minimum is `Σ(pᵢ × aᵢ)`

Algorithm:
1. Start with `n`, operations = 0
2. For each potential divisor `d` from 2 to n:
   - While `n % d == 0`:
     - Add `d` to operations
     - Divide `n` by `d`
3. Return operations

```python
operations = 0
divisor = 2
while n > 1:
    while n % divisor == 0:
        operations += divisor
        n //= divisor
    divisor += 1
return operations
```

Time: O(√n), Space: O(1) - optimal!

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Prime Factorization | O(√n) | O(1) | Optimal, most elegant |
| Dynamic Programming | O(n√n) | O(n) | Good for understanding problem structure |
| Recursive with Memo | O(n√n) | O(n) | Alternative DP formulation |

**Recommended**: Prime factorization for optimal complexity and elegant code.

## Common Mistakes

1. **Not recognizing the factorization pattern**
```python
# Wrong: Trying to simulate actual operations
def min_steps(n):
    count = 1  # Current A's
    clipboard = 0
    operations = 0
    while count < n:
        # Complex logic trying to decide when to copy vs paste
        ...
    # This approach is hard to optimize

# Correct: Use mathematical insight
def min_steps(n):
    operations = 0
    divisor = 2
    while n > 1:
        while n % divisor == 0:
            operations += divisor
            n //= divisor
        divisor += 1
    return operations
```

2. **DP with incorrect recurrence**
```python
# Wrong: Not considering all divisors
dp[i] = dp[i-1] + 1  # Only considers incrementing by 1

# Correct: Check all divisors
for i in range(2, n + 1):
    dp[i] = i  # Worst case: copy once, paste (i-1) times
    for j in range(2, i):
        if i % j == 0:
            dp[i] = min(dp[i], dp[j] + i // j)
```

3. **Inefficient factorization**
```python
# Wrong: Checking all numbers up to n
divisor = 2
while divisor < n:
    while n % divisor == 0:
        operations += divisor
        n //= divisor
    divisor += 1  # Can skip to next prime

# Correct: Only check up to sqrt(n) with optimization
divisor = 2
while divisor * divisor <= n:
    while n % divisor == 0:
        operations += divisor
        n //= divisor
    divisor += 1
if n > 1:  # n is a prime factor
    operations += n
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| 4 Keys Keyboard | Hard | Add Select All and Delete operations (M651) |
| 3 Keys Keyboard | Medium | Add backspace operation |
| Weighted Operations | Hard | Different costs for copy vs paste |
| Multiple Clipboards | Hard | Can use k different clipboards |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Understand why the answer is sum of prime factors
- [ ] Implement DP solution first to understand subproblem structure
- [ ] Implement prime factorization solution
- [ ] Trace through examples (n=6, n=9, n=12) by hand
- [ ] Handle edge cases (n=1, prime numbers, powers of 2)
- [ ] Optimize factorization to O(√n)
- [ ] Review after 1 day: Can you recall the prime factor insight?
- [ ] Review after 1 week: Implement without looking at notes
- [ ] Review after 1 month: Solve M651 (4 Keys Keyboard)

**Strategy**: See [Dynamic Programming Pattern](../strategies/patterns/dynamic-programming.md)
