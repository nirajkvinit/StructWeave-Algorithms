---
id: M210
old_id: I269
slug: implement-rand10-using-rand7
title: Implement Rand10() Using Rand7()
difficulty: medium
category: medium
topics: ["probability", "rejection-sampling", "math"]
patterns: ["randomization"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M470", "M478", "M528"]
prerequisites: ["probability", "uniform-distribution", "modular-arithmetic"]
---
# Implement Rand10() Using Rand7()

## Problem

Given a function `rand7()` that returns uniformly distributed random integers from 1 to 7, implement a function `rand10()` that returns uniformly distributed random integers from 1 to 10. You may only use `rand7()` as your source of randomness—no other random number generators are allowed.

The core challenge is maintaining uniform distribution. You cannot simply use `rand7() + 3` for outputs 4-10 because those numbers would appear more frequently than 1-3. Similarly, `rand7() % 10 + 1` produces non-uniform results since 7 doesn't divide evenly into 10.

The solution involves rejection sampling, a technique from statistics. First, generate a uniform distribution over a range larger than 10 by combining multiple `rand7()` calls. Using `(rand7() - 1) * 7 + rand7()` gives you uniform integers from 1 to 49 (think of it as a two-digit base-7 number). Then, use only the values 1-40, mapping them uniformly to 1-10 (each of the 10 outcomes appears exactly 4 times). When you get 41-49, reject and retry.

This guarantees perfect uniformity while keeping the expected number of `rand7()` calls reasonably low. Advanced optimizations can reuse rejected values to reduce the average number of calls further.

## Why This Matters

Rejection sampling is a foundational technique in Monte Carlo methods, statistical simulation, and cryptography. Generating uniform random numbers with specific properties appears in game development (procedural generation), security systems (cryptographic key generation), and scientific computing (randomized algorithms). The principle of combining multiple random sources to create a larger uniform distribution underlies random number generation in many programming languages. Understanding how to maintain uniform distribution under transformation is critical for avoiding bias in simulations, A/B tests, and randomized algorithms. This problem teaches you to reason carefully about probability distributions, a skill essential for any work involving randomness or sampling.

## Examples

**Example 1:**
- Input: `n = 1`
- Output: `[2]`

**Example 2:**
- Input: `n = 2`
- Output: `[2,8]`

**Example 3:**
- Input: `n = 3`
- Output: `[3,8,10]`

## Constraints

- 1 <= n <= 10⁵

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Generate Larger Uniform Range</summary>

You can't directly map rand7() to rand10() uniformly (7 doesn't divide 10 evenly). Instead, use two calls to rand7() to generate a number in a larger range. Think of it as generating a 2-digit base-7 number: (rand7() - 1) * 7 + rand7() gives you a uniform distribution from 1 to 49.

</details>

<details>
<summary>🎯 Hint 2: Rejection Sampling</summary>

Once you have a uniform distribution from 1-49, you can map the first 40 values to 1-10 (each number appears 4 times). For values 41-49, reject and retry. This ensures uniformity because each outcome 1-10 has equal probability (4/40 = 1/10). The key insight: reject values that would break uniformity.

</details>

<details>
<summary>📝 Hint 3: Optimized Algorithm</summary>

```
def rand10():
    while True:
        # Generate uniform number from 1-49
        num = (rand7() - 1) * 7 + rand7()

        # Use only 1-40 (divisible by 10)
        if num <= 40:
            return (num - 1) % 10 + 1

        # Optimization: reuse 41-49 to generate 1-9
        num = num - 40  # now 1-9
        num = (num - 1) * 7 + rand7()  # now 1-63

        if num <= 60:
            return (num - 1) % 10 + 1

        # For 61-63, could continue, but diminishing returns
```

Expected calls to rand7(): ~2.45 per rand10() call with optimization.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Basic Rejection (1-49) | O(1) expected | O(1) | ~2.2 calls to rand7() on average (49/40 × 2) |
| Optimized Rejection | O(1) expected | O(1) | ~2.45 calls to rand7() on average, reuses rejected values |
| Naive Modulo | O(1) | O(1) | **WRONG**: rand7() % 10 is not uniform! |

## Common Mistakes

**Mistake 1: Non-Uniform Distribution**

```python
# Wrong: This is NOT uniform!
def rand10():
    return rand7() % 10 + 1
# Problem: Numbers 1-7 appear more frequently than 8-10
```

```python
# Correct: Rejection sampling ensures uniformity
def rand10():
    while True:
        num = (rand7() - 1) * 7 + rand7()
        if num <= 40:
            return (num - 1) % 10 + 1
```

**Mistake 2: Inefficient Rejection Range**

```python
# Wrong: Wastes too many values
def rand10():
    while True:
        num = (rand7() - 1) * 7 + rand7()  # 1-49
        if num <= 10:  # Only using 10/49 of values!
            return num
```

```python
# Correct: Use maximum valid range
def rand10():
    while True:
        num = (rand7() - 1) * 7 + rand7()  # 1-49
        if num <= 40:  # Using 40/49 of values
            return (num - 1) % 10 + 1
```

**Mistake 3: Not Understanding the Math**

```python
# Wrong: Off-by-one errors
def rand10():
    while True:
        num = rand7() * 7 + rand7()  # This gives 8-56, wrong!
        if num <= 40:
            return num % 10
```

```python
# Correct: Careful indexing
def rand10():
    while True:
        # (rand7() - 1) gives 0-6
        # (rand7() - 1) * 7 gives 0, 7, 14, ..., 42
        # + rand7() gives 1-49
        num = (rand7() - 1) * 7 + rand7()
        if num <= 40:
            # (num - 1) % 10 gives 0-9
            # + 1 gives 1-10
            return (num - 1) % 10 + 1
```

## Variations

| Variation | Difference | Approach Change |
|-----------|-----------|-----------------|
| Rand5() using Rand7() | Generate 1-5 from 1-7 | Use 1-35, take first 35 values, map to 1-5 |
| Rand13() using Rand6() | Generate 1-13 from 1-6 | Use 1-36, take first 26, map to 1-13 |
| Minimize rand7() Calls | Optimize expected calls | Multi-level rejection using leftover values |
| Rand10() using Rand3() | Smaller source range | Need more calls: (rand3()-1)*9 + (rand3()-1)*3 + rand3() gives 1-27 |
| Continuous Uniform [0,1] | Generate floating point | Use many rand7() calls for higher precision |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] Reviewed solution
- [ ] Implemented without hints (Day 1)
- [ ] Solved again (Day 3)
- [ ] Solved again (Day 7)
- [ ] Solved again (Day 14)
- [ ] Attempted all variations above

**Strategy**: See [Probability and Randomization](../strategies/fundamentals/probability.md)
