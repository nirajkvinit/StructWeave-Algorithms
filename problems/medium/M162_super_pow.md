---
id: M162
old_id: I171
slug: super-pow
title: Super Pow
difficulty: medium
category: medium
topics: ["math", "recursion"]
patterns: ["divide-and-conquer"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E050", "M372", "E204"]
prerequisites: ["modular-arithmetic", "fast-exponentiation", "recursion"]
---
# Super Pow

## Problem

You need to compute the value of `a^b` modulo `1337`, where the base `a` is a regular positive integer but the exponent `b` is represented as an array of digits. This array representation is crucial because `b` can be astronomically large—imagine numbers with hundreds or thousands of digits, far too large to store as a normal integer. For instance, if `b = [1,0]`, this represents the exponent 10, so you'd compute `a^10 mod 1337`. The modulo operation keeps results manageable by wrapping values around 1337, returning the remainder after division. You cannot simply convert the array to a regular number and compute `a ** b` because such large exponents would cause overflow or take forever to calculate. The challenge is processing this massive exponent efficiently while applying the modulo at strategic points to prevent intermediate results from exploding. Consider edge cases like when `a = 1` (any power equals 1), when the exponent array has a single digit, or when `a` itself is larger than 1337.

## Why This Matters

This problem lies at the heart of modern cryptography, particularly in RSA encryption which secures everything from HTTPS web traffic to digital signatures. RSA relies on computing huge modular exponentiations efficiently—raising numbers to the power of 2048-bit exponents modulo large primes. Without the techniques you'll develop here, encryption would be computationally infeasible. Modular exponentiation also appears in hash functions, pseudorandom number generators, and blockchain proof-of-work systems where miners compute massive numbers of modular operations. Number theory problems in competitive programming frequently require this technique, and understanding how to break down giant exponents into manageable pieces is crucial for distributed computing systems that need to verify computations without redoing them. Financial systems use modular arithmetic for checksum algorithms, and game developers apply it for procedural content generation with deterministic but varied results.

## Examples

**Example 1:**
- Input: `a = 2, b = [3]`
- Output: `8`
- Note: The exponent is 3, so we compute 2³ mod 1337 = 8

**Example 2:**
- Input: `a = 2, b = [1,0]`
- Output: `1024`
- Note: The array [1,0] represents the number 10, so we compute 2¹⁰ mod 1337 = 1024

**Example 3:**
- Input: `a = 1, b = [4,3,3,8,5,2]`
- Output: `1`
- Note: Any power of 1 equals 1

## Constraints

- 1 <= a <= 2³¹ - 1
- 1 <= b.length <= 2000
- 0 <= b[i] <= 9
- b does not contain leading zeros.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Modular Arithmetic Properties</summary>

Remember these key properties:
- (a * b) mod m = ((a mod m) * (b mod m)) mod m
- (a^n) mod m = ((a mod m)^n) mod m

Since b can be huge, you can't compute a^b directly. Can you break down the exponent into smaller, manageable pieces?
</details>

<details>
<summary>🎯 Hint 2: Divide the Exponent</summary>

Think about the exponent as: b = [b₀, b₁, ..., bₙ] representing b₀*10^n + b₁*10^(n-1) + ... + bₙ

You can express: a^b = a^(b₀*10^n + b₁*10^(n-1) + ... + bₙ)

This can be decomposed as: (a^(b₀*10^n)) * (a^(b₁*10^(n-1))) * ... * (a^bₙ)

Process the array from left to right, building up the result recursively or iteratively.
</details>

<details>
<summary>📝 Hint 3: Recursive Formula</summary>

Pseudocode:
```
function powmod(a, k, mod):
    // Fast exponentiation with modulo
    result = 1
    a = a % mod
    while k > 0:
        if k is odd:
            result = (result * a) % mod
        k = k // 2
        a = (a * a) % mod
    return result

function superPow(a, b):
    if b is empty:
        return 1

    last_digit = b[last]
    b_without_last = b[0..n-2]

    // a^1234 = (a^123)^10 * a^4
    part1 = powmod(superPow(a, b_without_last), 10, 1337)
    part2 = powmod(a, last_digit, 1337)

    return (part1 * part2) % 1337
```
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Naive Power | O(10^n) | O(1) | n is length of b; impossible for large b |
| **Modular Exponentiation** | **O(n * log(1337))** | **O(n)** | Process each digit with fast exponentiation |

## Common Mistakes

**Mistake 1: Computing a^b directly**
```python
# Wrong: Overflow and too slow for large b
def superPow(a, b):
    exponent = int(''.join(map(str, b)))
    return (a ** exponent) % 1337  # Fails for large exponent
```

**Mistake 2: Not applying modulo at each step**
```python
# Wrong: Intermediate results can overflow
def superPow(a, b):
    result = 1
    for digit in b:
        result = result ** 10 * a ** digit  # Missing mod operations
    return result % 1337
```

```python
# Correct: Apply modulo at each step
def superPow(a, b):
    MOD = 1337

    def powmod(base, exp):
        result = 1
        base %= MOD
        while exp > 0:
            if exp % 2 == 1:
                result = (result * base) % MOD
            base = (base * base) % MOD
            exp //= 2
        return result

    result = 1
    for digit in b:
        result = powmod(result, 10) * powmod(a, digit) % MOD

    return result
```

**Mistake 3: Inefficient exponentiation**
```python
# Wrong: O(k) instead of O(log k) for each exponentiation
def powmod(a, k, mod):
    result = 1
    for _ in range(k):  # Too slow
        result = (result * a) % mod
    return result
```

## Variations

| Variation | Difference | Hint |
|-----------|-----------|------|
| Different modulo | Use mod m instead of 1337 | Same algorithm, different modulus |
| Matrix exponentiation | Compute M^b mod m | Apply same modular exponentiation to matrices |
| Multiple bases | Compute a₁^b * a₂^b * ... mod m | Process each base separately, multiply results |
| Tetration | Compute a^(a^(a^...)) | Use Euler's theorem for modular reduction |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Reviewed solution
- [ ] Attempted again after 1 day
- [ ] Attempted again after 3 days
- [ ] Attempted again after 1 week
- [ ] Attempted again after 2 weeks
