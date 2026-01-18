---
id: M314
old_id: A127
slug: remove-9
title: Remove 9
difficulty: medium
category: medium
topics: ["math", "number-theory"]
patterns: ["base-conversion", "mathematical-insight"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E168", "E171", "M233"]
prerequisites: ["number-systems", "base-conversion"]
---
# Remove 9

## Problem

Imagine listing all positive integers starting from 1, but skipping every number that contains the digit 9 anywhere in its decimal representation.

This creates a filtered sequence: `1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, ..., 18, 20, 21, ...` where we skip 9, 19, 29, 39, ..., 90-99, 109, 119, and so on. Notice that we also skip 90 through 99 entirely since they all contain the digit 9.

Given a positive integer `n`, find the `nth` number in this filtered sequence using 1-based indexing. For example, the 1st number is 1, the 9th number is 10 (since we skipped 9), and the 10th number is 11.

The naive approach of iterating through all integers and checking each for the digit 9 will timeout for large `n` values (up to 800 million). The key insight involves recognizing a mathematical pattern related to number base systems that allows direct computation in logarithmic time.

## Why This Matters

This problem reveals a beautiful connection between constraint-based number sequences and positional number systems, demonstrating how abstract mathematical concepts solve practical problems. The insight that removing digit 9 from base 10 is equivalent to working in base 9 appears in various domains. Checksums and error detection codes avoid certain digit patterns for reliability. Some industrial systems use restricted digit sets for display compatibility or to avoid confusion between similar-looking digits (like 0 and O, or 1 and I). This problem builds pattern recognition skills essential for optimization: recognizing when a seemingly iterative problem has a closed-form mathematical solution. Understanding base conversion is fundamental to computer science, appearing in hexadecimal memory addresses, binary encoding, and hash function design.

## Examples

**Example 1:**
- Input: `n = 9`
- Output: `10`

**Example 2:**
- Input: `n = 10`
- Output: `11`

## Constraints

- 1 <= n <= 8 * 10⁸

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Pattern Recognition - Base 9 Connection</summary>

The sequence without digit 9 is remarkably similar to counting in base 9! Consider:
- Base 10 with digit 9 removed: 1,2,3,4,5,6,7,8,10,11,12,...,18,20,21,...
- Base 9 representation: 1,2,3,4,5,6,7,8,10,11,12,...,18,20,21,...

When we remove 9 from base 10, we're essentially using only digits 0-8, which is exactly base 9. The nth number in our sequence is simply n represented in base 9, but written using base 10 digits.

</details>

<details>
<summary>Hint 2: Base Conversion Algorithm</summary>

To convert n to base 9 and interpret digits as base 10:
```
result = 0
multiplier = 1
while n > 0:
    result += (n % 9) * multiplier
    n //= 9
    multiplier *= 10
return result
```

This works because each position in base 9 uses digits 0-8, which are exactly the digits we want (excluding 9). For example, n=9 gives us base-9 representation "10", which we return as the decimal number 10.

</details>

<details>
<summary>Hint 3: Mathematical Insight</summary>

Alternative perspective: think of this as a bijection (one-to-one mapping) between:
- Input: positive integers {1, 2, 3, ...}
- Output: positive integers without digit 9 {1, 2, 3, ..., 8, 10, 11, ...}

The mapping is: convert input from base 10 to base 9, then read the base-9 digits as if they were base 10. This maintains the ordering and gives exactly the sequence we want.

Special case: be careful with the conversion - you want the nth element (1-indexed), so convert n directly to base 9.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Base 9 Conversion | O(log n) | O(1) | Number of digits in base 9 representation |
| Simulation/Counting | O(n) | O(1) | Count numbers without 9 (TLE for large n) |
| Recursive Formula | O(log n) | O(log n) | Similar to base conversion |

## Common Mistakes

**Mistake 1: Trying to Skip 9s by Simulation**
```python
# WRONG: Simulating and checking each number (too slow)
def newInteger(n):
    count = 0
    num = 0
    while count < n:
        num += 1
        if '9' not in str(num):  # Check if 9 is present
            count += 1
    return num
    # This is O(n) and times out for large n

# CORRECT: Use base 9 conversion (O(log n))
def newInteger(n):
    result = 0
    base = 1
    while n > 0:
        result += (n % 9) * base
        n //= 9
        base *= 10
    return result
```

**Mistake 2: Off-by-One in Base Conversion**
```python
# WRONG: Converting n-1 or adjusting incorrectly
def newInteger(n):
    # Wrong thinking: "0-indexed base 9"
    result = 0
    base = 1
    n -= 1  # Wrong adjustment
    while n >= 0:
        result += (n % 9) * base
        n //= 9
        base *= 10
    return result

# CORRECT: Convert n directly (1-indexed matches naturally)
def newInteger(n):
    result = 0
    base = 1
    while n > 0:
        result += (n % 9) * base
        n //= 9
        base *= 10
    return result
```

**Mistake 3: String Manipulation Instead of Math**
```python
# WRONG: Complex string manipulation (inefficient and error-prone)
def newInteger(n):
    # Convert to base 9 string, then to int
    base9_str = ""
    temp = n
    while temp > 0:
        base9_str = str(temp % 9) + base9_str
        temp //= 9
    return int(base9_str) if base9_str else 0
    # Works but unnecessary string operations

# CORRECT: Direct mathematical conversion
def newInteger(n):
    result = 0
    base = 1
    while n > 0:
        result += (n % 9) * base
        n //= 9
        base *= 10
    return result
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Remove Digit K | Generalize to remove any digit k (0-9) | Easy |
| Remove Multiple Digits | Remove all numbers containing digits from a set | Medium |
| Binary Without Consecutive 1s | Count binary numbers without consecutive 1s | Medium |
| Lexicographic Kth Number | Find kth number in lexicographic order | Medium |
| Custom Base Conversion | Convert between arbitrary bases | Easy |

## Practice Checklist

- [ ] First attempt (30 min)
- [ ] Recognize the base 9 pattern
- [ ] Implement base conversion correctly
- [ ] Test examples: n=9 (should give 10), n=10 (should give 11)
- [ ] Verify with n=18 (should give 20), n=81 (should give 100)
- [ ] Handle edge case: n=1
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Attempt variation: remove digit k

**Strategy**: See [Mathematical Pattern](../strategies/patterns/mathematical-problems.md)
