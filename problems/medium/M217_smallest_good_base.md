---
id: M217
old_id: I282
slug: smallest-good-base
title: Smallest Good Base
difficulty: medium
category: medium
topics: ["math", "binary-search"]
patterns: ["mathematical"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E231", "M29", "M50"]
prerequisites: ["binary-search", "logarithms", "geometric-series", "number-theory"]
---
# Smallest Good Base

## Problem

Given an integer `n` (represented as a string because it can be as large as 10^18), find the smallest base `k` (where k ≥ 2) such that `n` can be represented in base `k` using only the digit `1`.

To understand what this means, consider `n = 13`. In base 3, the number 13 equals `1×3² + 1×3¹ + 1×3⁰ = 9 + 3 + 1 = 13`, which we write as `111₃`. So base 3 is a "good base" for 13. Similarly, `n = 4681` in base 8 equals `11111₈` because `1×8⁴ + 1×8³ + 1×8² + 1×8¹ + 1×8⁰ = 4096 + 512 + 64 + 8 + 1 = 4681`.

The mathematical insight is that a number represented as m ones in base k equals the geometric series: n = 1 + k + k² + ... + k^(m-1) = (k^m - 1)/(k - 1). This formula connects three variables: the target number n, the base k, and the number of digits m. Your task is to find the smallest valid k.

Here's the key constraint: the number of ones (m) is limited by physics. Since k ≥ 2, we have n ≥ 2^(m-1), which means m ≤ log₂(n) + 1 ≈ 60 for n up to 10^18. This makes it feasible to iterate through all possible values of m and use binary search to find the corresponding k for each m. The first valid k you find (starting from the largest m) will be the smallest good base.

Edge case awareness: `n-1` is always a valid base (representing n as `11` in base n-1), so a solution always exists.

## Why This Matters

This problem combines number theory, geometric series, and binary search in an elegant way. It demonstrates how mathematical analysis can dramatically reduce search spaces - instead of testing billions of bases, you test only ~60 possibilities. The geometric series formula appears throughout computer science: in analyzing recursive algorithms, calculating compound interest, understanding exponential backoff in networking, and modeling growth processes. This problem also teaches you to work with extremely large numbers (up to 10^18) where precision and overflow prevention are critical. The technique of fixing one variable to constrain others is a powerful problem-solving strategy applicable to optimization, constraint satisfaction, and system design.

## Examples

**Example 1:**
- Input: `n = "13"`
- Output: `"3"`
- Explanation: When 13 is expressed in base 3, it becomes 111.

**Example 2:**
- Input: `n = "4681"`
- Output: `"8"`
- Explanation: The number 4681 in base 8 equals 11111.

**Example 3:**
- Input: `n = "1000000000000000000"`
- Output: `"999999999999999999"`
- Explanation: In base 999999999999999999, the number 1000000000000000000 is represented as 11.

## Constraints

- n is an integer in the range [3, 10¹⁸].
- n does not contain any leading zeros.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Geometric Series Formula</summary>

If n in base k is represented as m ones (111...1), then n = k^(m-1) + k^(m-2) + ... + k + 1. This is a geometric series: n = (k^m - 1) / (k - 1). Rearranging: k^m = n(k-1) + 1. For a given m (number of 1s), you can binary search for k that satisfies this equation.

</details>

<details>
<summary>🎯 Hint 2: Iterate Over Length m</summary>

The number of digits m is limited. Since k >= 2 and n = 1 + k + k² + ... + k^(m-1), we have n >= 2^(m-1), so m <= log₂(n) + 1 ≈ 60 for n up to 10¹⁸. Start from the largest possible m and work down to 2. For each m, binary search for the exact k. The first valid k you find is the smallest good base.

</details>

<details>
<summary>📝 Hint 3: Binary Search Implementation</summary>

```
def smallest_good_base(n):
    n_val = int(n)

    # Maximum possible number of digits
    max_m = int(math.log2(n_val)) + 1

    # Try each possible length m from largest to smallest
    for m in range(max_m, 1, -1):
        # Binary search for base k
        # Minimum k is 2
        # Maximum k is (n_val)^(1/(m-1)) since n >= k^(m-1)
        left = 2
        right = int(n_val ** (1.0 / (m - 1))) + 1

        while left <= right:
            mid = (left + right) // 2

            # Calculate sum: 1 + k + k^2 + ... + k^(m-1)
            total = 0
            for i in range(m):
                total += mid ** i
                if total > n_val:  # Early exit to avoid overflow
                    break

            if total == n_val:
                return str(mid)
            elif total < n_val:
                left = mid + 1
            else:
                right = mid - 1

    # If no good base found, n-1 is always valid (11 in base n-1)
    return str(n_val - 1)
```

Alternative using geometric series formula:
```
def smallest_good_base(n):
    n_val = int(n)
    max_m = int(math.log2(n_val)) + 1

    for m in range(max_m, 1, -1):
        k = int(n_val ** (1.0 / (m - 1)))

        # Check if this k works
        total = sum(k ** i for i in range(m))
        if total == n_val:
            return str(k)

    return str(n_val - 1)
```

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force | O(n) | O(1) | Try all bases from 2 to n-1 |
| Iterate m + Binary Search k | O(log²n × log n) | O(1) | ~60 values of m, binary search each |
| Iterate m + Direct Calculation | O(log²n) | O(1) | ~60 values of m, direct k calculation |
| Mathematical Optimization | O(log²n) | O(1) | Most efficient practical solution |

## Common Mistakes

**Mistake 1: Integer Overflow**

```python
# Wrong: Can overflow when computing k^m for large values
def check_base(n, k, m):
    total = 0
    for i in range(m):
        total += k ** i  # May overflow!
    return total == n
```

```python
# Correct: Check for overflow and exit early
def check_base(n, k, m):
    total = 0
    for i in range(m):
        total += k ** i
        if total > n:
            return False  # Exit early
    return total == n
```

**Mistake 2: Wrong Binary Search Range**

```python
# Wrong: Binary search range too large or too small
for m in range(60, 1, -1):
    left = 2
    right = n_val  # Too large! Will be very slow
    # ...
```

```python
# Correct: Use mathematical bound for right
for m in range(max_m, 1, -1):
    left = 2
    right = int(n_val ** (1.0 / (m - 1))) + 1
    # ...
```

**Mistake 3: Not Returning n-1 as Fallback**

```python
# Wrong: Doesn't handle case where no base found
def smallest_good_base(n):
    n_val = int(n)
    for m in range(60, 1, -1):
        # ... binary search ...
        if found:
            return str(k)
    # Missing return statement!
```

```python
# Correct: Always return n-1 as fallback (represents 11 in base n-1)
def smallest_good_base(n):
    n_val = int(n)
    for m in range(max_m, 1, -1):
        # ... search ...
        if found:
            return str(k)
    return str(n_val - 1)  # Guaranteed to work
```

## Variations

| Variation | Difference | Approach Change |
|-----------|-----------|-----------------|
| All Good Bases | Find all valid bases | Iterate through all m, collect all valid k |
| Largest Good Base | Find largest base instead of smallest | Iterate m from 2 upward |
| Base with Specific Digit Pattern | e.g., all 2s instead of 1s | Modify geometric series formula |
| Count Good Bases | How many bases work | Iterate and count all valid combinations |
| Good Base in Range | Find good base in range [L, R] | Add range constraints to binary search |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] Reviewed solution
- [ ] Implemented without hints (Day 1)
- [ ] Solved again (Day 3)
- [ ] Solved again (Day 7)
- [ ] Solved again (Day 14)
- [ ] Attempted all variations above

**Strategy**: See [Binary Search](../strategies/patterns/binary-search.md) and [Mathematical Problems](../strategies/fundamentals/math.md)
