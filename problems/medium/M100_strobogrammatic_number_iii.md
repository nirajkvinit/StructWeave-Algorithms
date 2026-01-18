---
id: M100
old_id: I048
slug: strobogrammatic-number-iii
title: Strobogrammatic Number III
difficulty: medium
category: medium
topics: ["recursion", "string", "math"]
patterns: ["recursion", "range-counting"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E246", "M099"]
prerequisites: ["recursion", "string-comparison", "range-queries"]
---
# Strobogrammatic Number III

## Problem

You are provided with two strings `low` and `high` representing non-negative integers, where `low <= high`. Your task is to count how many strobogrammatic numbers exist in the inclusive range `[low, high]`. Remember that a strobogrammatic number looks identical when rotated 180 degrees, using only the digits that have valid rotations: 0, 1, 6, 8, and 9 (where 6 and 9 swap). The inputs are given as strings rather than integers because they can be very large (up to 15 digits), far exceeding what standard integer types can handle. For example, if `low = "50"` and `high = "100"`, you need to count numbers like 69, 88, and 96 that fall within this range. The challenge is to efficiently generate strobogrammatic numbers of various lengths and filter those within the bounds, using string comparison to handle the large numbers. You can't simply iterate through every number in the range (which could be trillions of numbers), so you need to be smart about generating only candidates and pruning the search space.

## Why This Matters

This problem combines range queries with combinatorial generation and large number handling, skills that appear in many real-world systems. Database query optimizers often need to count records matching complex criteria within numeric ranges, using generation and filtering strategies similar to this problem. Analytics platforms computing statistics over massive datasets (like counting IP addresses or transaction IDs with specific patterns) use range-based enumeration with constraints. License key validation systems need to count how many valid keys exist within certain ranges, often with symmetry or pattern requirements. Performance testing tools generate test data within specific bounds that satisfy certain properties. The techniques here—generating candidates by length, using string comparison for large numbers, and pruning based on range bounds—are fundamental to building efficient data processing pipelines that handle numeric constraints, which is a common requirement in financial systems, inventory management, and large-scale data analytics.

## Examples

**Example 1:**
- Input: `low = "50", high = "100"`
- Output: `3`

**Example 2:**
- Input: `low = "0", high = "0"`
- Output: `1`

## Constraints

- 1 <= low.length, high.length <= 15
- low and high consist of only digits.
- low <= high
- low and high do not contain any leading zeros except for zero itself.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Build on Strobogrammatic Number II</summary>

You can reuse the logic from generating all n-digit strobogrammatic numbers. Generate all strobogrammatic numbers for each length from len(low) to len(high), then filter those within the range [low, high].

</details>

<details>
<summary>🎯 Hint 2: String Comparison Strategy</summary>

For each length L from len(low) to len(high), generate all L-digit strobogrammatic numbers. Count those that satisfy: (L > len(low) OR number >= low) AND (L < len(high) OR number <= high). Use string comparison since numbers can be very large.

</details>

<details>
<summary>📝 Hint 3: Algorithm Design</summary>

Pseudocode approach:
```
count = 0
for length from len(low) to len(high):
    numbers = generateStrobogrammatic(length)
    for num in numbers:
        # String comparison works for same-length numbers
        if len(num) > len(low) or num >= low:
            if len(num) < len(high) or num <= high:
                count += 1
return count

# Handle edge cases:
# - Single digit "0" is strobogrammatic
# - Leading zeros not allowed except for "0" itself
# - Very large numbers (up to 15 digits)
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(10^15) | O(1) | Check every number in range - impractical |
| Generate All | O(5^8 × 15) | O(5^8) | Generate for each length, max length 15 |
| **Optimal with Pruning** | **O(5^(h/2) × h)** | **O(5^(h/2))** | h = len(high), generate only valid lengths |

Where h is the length of the high string (max 15).

## Common Mistakes

**Mistake 1: Not handling different length ranges correctly**
```python
# Wrong: Only generates numbers of exact length
def count_in_range(low, high):
    n = len(low)
    numbers = generate_strobogrammatic(n)
    count = 0
    for num in numbers:
        if low <= num <= high:
            count += 1
    return count
```

```python
# Correct: Generate for all lengths in range
def count_in_range(low, high):
    count = 0
    for length in range(len(low), len(high) + 1):
        numbers = generate_strobogrammatic(length)
        for num in numbers:
            if compare(num, low) >= 0 and compare(num, high) <= 0:
                count += 1
    return count
```

**Mistake 2: Integer overflow with large numbers**
```python
# Wrong: Converting to int fails for 15-digit numbers
def count_in_range(low, high):
    low_int = int(low)
    high_int = int(high)
    # ... may overflow or be very slow
```

```python
# Correct: Use string comparison
def count_in_range(low, high):
    # Strings can be compared lexicographically
    # For same-length strings, lexicographic = numeric order
    for num in numbers:
        if len(num) == len(low) and num < low:
            continue
        if len(num) == len(high) and num > high:
            continue
        count += 1
```

**Mistake 3: Including leading zero numbers except "0"**
```python
# Wrong: Counts "00", "08" as valid strobogrammatic numbers
def generate_strobogrammatic(n):
    if n == 0: return [""]
    if n == 1: return ["0", "1", "8"]
    middles = generate_strobogrammatic(n - 2)
    result = []
    for middle in middles:
        for pair in [("0","0"), ("1","1"), ("6","9"), ("8","8"), ("9","6")]:
            result.append(pair[0] + middle + pair[1])
    return result
```

```python
# Correct: Exclude leading zeros for n-digit numbers (n > 1)
def generate_strobogrammatic(n, length=None):
    if length is None: length = n
    if n == 0: return [""]
    if n == 1: return ["0", "1", "8"]
    middles = generate_strobogrammatic(n - 2, length)
    result = []
    for middle in middles:
        for pair in [("0","0"), ("1","1"), ("6","9"), ("8","8"), ("9","6")]:
            if n != length or pair[0] != "0":
                result.append(pair[0] + middle + pair[1])
    return result
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Strobogrammatic Number I | Check if single number is strobogrammatic | Easy |
| Strobogrammatic Number II | Generate all n-digit strobogrammatic numbers | Medium |
| Count Palindromes in Range | Count palindromic numbers in range | Medium |
| Count Numbers with Property | Generic counting in range with constraint | Hard |
| Sum of Strobogrammatic Numbers | Sum all strobogrammatic numbers in range | Hard |

## Practice Checklist

- [ ] Initial attempt (Day 0)
- [ ] Reviewed range counting strategy (Day 0)
- [ ] Implemented length-based generation (Day 0)
- [ ] First spaced repetition (Day 1)
- [ ] Second spaced repetition (Day 3)
- [ ] Third spaced repetition (Day 7)
- [ ] Fourth spaced repetition (Day 14)
- [ ] Can explain string comparison approach (Day 14)
- [ ] Can code without references (Day 30)
- [ ] Interview-ready confidence (Day 30)

**Strategy**: Generate strobogrammatic numbers for each length in range, filter using string comparison to handle large numbers efficiently.
