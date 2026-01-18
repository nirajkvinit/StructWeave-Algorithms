---
id: M135
old_id: I118
slug: bulb-switcher
title: Bulb Switcher
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
frequency: low
related_problems: ["M135", "E191", "M136"]
prerequisites: ["math", "number-theory", "perfect-squares"]
---
# Bulb Switcher

## Problem

Imagine you have `n` light bulbs arranged in a row, all initially turned off, and you're going to perform a series of toggling operations. In round 1, you walk through and toggle every single bulb (turning them all on). In round 2, you toggle every second bulb (bulbs at positions 2, 4, 6, 8, etc.), flipping their state from on to off or off to on. In round 3, you toggle every third bulb (positions 3, 6, 9, 12, etc.). The pattern continues where in round `i`, you toggle every `i`-th bulb.

Let's trace through a small example to build intuition. With 4 bulbs, round 1 turns on all four bulbs. Round 2 toggles bulbs 2 and 4, turning them off. Round 3 toggles only bulb 3, turning it off. Round 4 toggles only bulb 4, turning it back on. So you end with bulbs 1 and 4 on, and bulbs 2 and 3 off. Here's the key observation: each bulb gets toggled once for every divisor of its position number. Bulb 12 gets toggled in rounds 1, 2, 3, 4, 6, and 12 because those are its divisors. Since bulbs start off, a bulb will be on at the end if it gets toggled an odd number of times. The challenge is to determine how many bulbs remain illuminated after all `n` rounds complete. The constraint that `n` can be as large as 10⁹ means simulation is impossible; you need to find a mathematical pattern or closed-form solution.


**Diagram:**

```
Example with n = 3 bulbs (● = on, ○ = off):

Initial:     Round 1:     Round 2:     Round 3:
○ ○ ○        ● ● ●        ● ○ ●        ● ○ ○
             (toggle all) (toggle 2nd) (toggle 3rd)

Bulb 1: toggled in rounds 1 → final: ON  (●)
Bulb 2: toggled in rounds 1, 2 → final: OFF (○)
Bulb 3: toggled in rounds 1, 3 → final: OFF (○)

Result: 1 bulb on

Example with n = 4:
Round 0: ○ ○ ○ ○
Round 1: ● ● ● ●  (toggle 1,2,3,4)
Round 2: ● ○ ● ○  (toggle 2,4)
Round 3: ● ○ ○ ○  (toggle 3)
Round 4: ● ○ ○ ●  (toggle 4)

Result: 2 bulbs on (bulbs 1 and 4 - perfect squares!)
```


## Why This Matters

This problem is a masterclass in pattern recognition and mathematical reasoning, skills that separate good programmers from great ones. In software engineering, you'll frequently encounter situations where the obvious simulation approach is too slow and you need to step back and find the underlying mathematical structure. Cryptographic algorithms rely on number-theoretic properties similar to divisor counting. Performance optimization often requires recognizing that seemingly complex iterations can be replaced with closed-form formulas. The specific concept here, understanding properties of perfect squares and divisors, connects to many areas: hash table implementations use properties of primes and divisors for distribution, graphics algorithms use square roots for distance calculations, and compression algorithms exploit mathematical patterns to reduce data size. Beyond the specific math, this problem teaches you to question your first instinct (simulation), analyze what's really happening (toggle counts relate to divisors), and derive an elegant solution (count perfect squares). This analytical progression, from brute force to insight to optimal solution, is exactly how experts approach complex problems.

## Examples

**Example 1:**
- Input: `n = 0`
- Output: `0`

**Example 2:**
- Input: `n = 1`
- Output: `1`

## Constraints

- 0 <= n <= 10⁹

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Pattern in Toggle Count</summary>

Bulb i gets toggled once for each of its divisors. For example, bulb 12 is toggled in rounds 1, 2, 3, 4, 6, and 12 (all divisors of 12). A bulb ends up ON if it's toggled an odd number of times. When does a number have an odd number of divisors?
</details>

<details>
<summary>🎯 Hint 2: Perfect Squares Property</summary>

Most numbers have divisors that come in pairs: for 12, we have (1,12), (2,6), (3,4). Each pair contributes 2 divisors (even count). Perfect squares are special because one divisor pairs with itself: for 9, we have (1,9), (3,3). The middle divisor (3) doesn't have a distinct pair, giving an odd total count.
</details>

<details>
<summary>📝 Hint 3: Mathematical Solution</summary>

Only perfect squares have an odd number of divisors. Therefore, only bulbs at positions 1, 4, 9, 16, 25, ... (perfect squares) remain on. The answer is simply the count of perfect squares ≤ n.

Formula: floor(√n)

Examples:
- n = 9: √9 = 3, so 3 bulbs on (1, 4, 9)
- n = 10: √10 ≈ 3.16, floor = 3, so 3 bulbs on (1, 4, 9)

Time: O(1), Space: O(1)
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Simulation | O(n²) | O(n) | Toggle each bulb, track states |
| Optimized Simulation | O(n√n) | O(n) | Only toggle divisor positions |
| **Mathematical** | **O(1)** | **O(1)** | **Count perfect squares: floor(√n)** |

## Common Mistakes

### Mistake 1: Attempting to Simulate for Large n

```python
# WRONG: Times out for large n (up to 10^9)
def bulbSwitch(n):
    bulbs = [False] * (n + 1)  # Memory error for n=10^9

    for round in range(1, n + 1):
        for bulb in range(round, n + 1, round):
            bulbs[bulb] = not bulbs[bulb]

    return sum(bulbs)  # O(n^2) time
```

```python
# CORRECT: Mathematical O(1) solution
def bulbSwitch(n):
    import math
    return int(math.sqrt(n))
```

### Mistake 2: Not Recognizing the Perfect Square Pattern

```python
# WRONG: Counting divisors for each number (still too slow)
def bulbSwitch(n):
    count = 0
    for i in range(1, n + 1):
        divisors = 0
        for j in range(1, i + 1):
            if i % j == 0:
                divisors += 1
        if divisors % 2 == 1:  # Odd divisors
            count += 1
    return count  # O(n^2)
```

```python
# CORRECT: Recognize perfect squares directly
def bulbSwitch(n):
    # Perfect squares have odd number of divisors
    # Count of perfect squares ≤ n is floor(√n)
    return int(n ** 0.5)
```

### Mistake 3: Floating Point Precision Issues

```python
# WRONG: Potential precision issues with large numbers
def bulbSwitch(n):
    return int(n ** 0.5)  # Could have precision errors
```

```python
# CORRECT: Use integer square root for precision
def bulbSwitch(n):
    # Method 1: Using int() which truncates
    return int(n ** 0.5)

    # Method 2: More robust for very large n
    if n == 0:
        return 0

    # Binary search for integer square root
    left, right = 1, n
    while left <= right:
        mid = (left + right) // 2
        if mid * mid == n:
            return mid
        elif mid * mid < n:
            result = mid
            left = mid + 1
        else:
            right = mid - 1
    return result
```

## Variations

| Variation | Description | Key Difference |
|-----------|-------------|----------------|
| Bulb Switcher II | Limited toggles with different patterns | Use bit manipulation and memoization |
| Bulb Switcher III | Turn on bulbs sequentially | Track consecutive on bulbs |
| K Rounds Only | Stop after k rounds instead of n | Count squares ≤ min(k, n) |
| Reverse Problem | How many rounds for k bulbs on | Solve k = floor(√n) for n |
| Weighted Toggles | Different rounds have different weights | More complex divisor analysis |
| Multiple Bulbs per Position | Multiple bulbs at each position | Multiply result by bulbs per position |

## Practice Checklist

- [ ] Day 1: Solve with simulation, recognize pattern
- [ ] Day 2: Derive mathematical formula
- [ ] Day 3: Solve without hints in O(1)
- [ ] Day 7: Explain why perfect squares work
- [ ] Day 14: Speed test - solve in 5 minutes
- [ ] Day 30: Prove the divisor property mathematically

**Strategy**: See [Mathematical Patterns](../strategies/fundamentals/math-fundamentals.md)
