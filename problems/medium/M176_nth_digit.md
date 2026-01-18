---
id: M176
old_id: I199
slug: nth-digit
title: Nth Digit
difficulty: medium
category: medium
topics: ["math", "binary-search"]
patterns: ["mathematical-pattern"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M060", "M172", "E202"]
prerequisites: ["mathematical-thinking", "number-ranges"]
---
# Nth Digit

## Problem

Picture an infinitely long string created by writing all positive integers in order and joining them together without any separators: `123456789101112131415...` The sequence starts with single-digit numbers (1 through 9), then moves to two-digit numbers (10 through 99), then three-digit numbers (100 through 999), and so on forever. Your task is to find the digit at a specific position `n` in this endless sequence, where positions are counted starting from 1.

Let's walk through some examples to understand the pattern. If `n = 3`, you're looking at position 3 in the sequence `123456789...`, which is the digit `3`. If `n = 11`, you need to count carefully: positions 1-9 contain the single-digit numbers `123456789`, then position 10 starts the two-digit numbers with the `1` from `10`, and position 11 contains the `0` from `10`, so the answer is `0`. Here's a less obvious example: if `n = 15`, you skip past the 9 single-digit numbers (contributing 9 digits total), then count into the two-digit range. Position 10 and 11 are from `10`, positions 12 and 13 are from `11`, positions 14 and 15 are from `12`, so position 15 is the second digit of `12`, which is `2`.

The key insight is recognizing the contribution pattern: single-digit numbers (1-9) contribute 9 × 1 = 9 digits total; two-digit numbers (10-99) contribute 90 × 2 = 180 digits; three-digit numbers (100-999) contribute 900 × 3 = 2,700 digits, and so on. Using this pattern, you can quickly determine which "digit-length group" contains your target position without generating the entire sequence. Once you know the group, you can calculate exactly which number contains the digit, and which position within that number. The constraint is that `n` can be as large as 2³¹ - 1, so generating the actual sequence is impossible; you must solve this mathematically.

## Why This Matters

This problem models data indexing challenges in databases and file systems. When a database stores variable-length records or a file system allocates blocks of different sizes, finding the record or block at a specific offset requires similar mathematical calculations to avoid scanning through all preceding data. Pagination systems use analogous math to jump directly to a page without counting all previous entries. Log file analyzers that extract the Nth entry from compressed multi-segment logs use the same principle. Streaming services calculate which video segment contains a given timestamp using interval arithmetic. This problem teaches you to recognize arithmetic progressions and use them to partition a search space efficiently. By identifying how many items of each size exist and how much space they occupy, you can binary-search or directly calculate which partition contains your target, then find the exact position within that partition. This "skip to the right range" technique is fundamental in systems that handle non-uniform data distributions. It also demonstrates the power of mathematical reasoning over brute-force generation, showing how O(log n) closed-form solutions vastly outperform O(n) sequential approaches when dealing with massive indices.

## Examples

**Example 1:**
- Input: `n = 3`
- Output: `3`

**Example 2:**
- Input: `n = 11`
- Output: `0`
- Explanation: When we write out the sequence as digits (1,2,3,4,5,6,7,8,9,1,0,...), the 11th position contains 0, which comes from the number 10.

## Constraints

- 1 <= n <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Pattern in Digit Contributions</summary>

Numbers contribute different amounts of digits:
- 1-digit numbers (1-9): 9 numbers × 1 digit = 9 digits
- 2-digit numbers (10-99): 90 numbers × 2 digits = 180 digits
- 3-digit numbers (100-999): 900 numbers × 3 digits = 2700 digits

Use this pattern to jump to the correct range without generating all digits.

</details>

<details>
<summary>🎯 Hint 2: Three-Step Process</summary>

1. Find which "digit length group" (1-digit, 2-digit, etc.) contains the nth digit
2. Within that group, find which specific number contains it
3. Within that number, find which digit position

For example, if n=15, it's in the 2-digit group (past first 9 digits), specifically in number 13, at the second digit.

</details>

<details>
<summary>📝 Hint 3: Mathematical Calculation</summary>

Algorithm:
1. Subtract digits contributed by each group until you find the right group
2. Calculate: which_number = start_of_group + (remaining_digits - 1) / digits_per_number
3. Calculate: which_digit = (remaining_digits - 1) % digits_per_number
4. Return the digit at that position in the number

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Generate Sequence | O(n) | O(n) | TLE and MLE for large n |
| Binary Search | O(log² n) | O(1) | Search for the range, then position |
| **Mathematical Direct** | **O(log n)** | **O(1)** | Optimal: calculate range in constant iterations |

## Common Mistakes

### Mistake 1: Off-by-one errors in indexing

```python
# Wrong: 1-indexed vs 0-indexed confusion
def findNthDigit(n):
    digit_len = 1
    count = 9
    start = 1

    # Find the range
    while n > digit_len * count:
        n -= digit_len * count
        digit_len += 1
        count *= 10
        start *= 10

    # WRONG: Incorrect indexing logic
    num = start + n // digit_len
    digit_index = n % digit_len

    return int(str(num)[digit_index])

# Correct: Careful with 0-indexed string access
def findNthDigit(n):
    digit_len = 1
    count = 9
    start = 1

    while n > digit_len * count:
        n -= digit_len * count
        digit_len += 1
        count *= 10
        start *= 10

    # n is now 1-indexed within the current range
    num = start + (n - 1) // digit_len
    digit_index = (n - 1) % digit_len

    return int(str(num)[digit_index])
```

### Mistake 2: Integer overflow in calculations

```python
# Wrong: Can overflow for large n
def findNthDigit(n):
    digit_len = 1
    count = 9
    start = 1

    while n > digit_len * count:
        # WRONG: For large n, digit_len * count can overflow
        n -= digit_len * count
        digit_len += 1
        count *= 10
        start *= 10

    num = start + (n - 1) // digit_len
    digit_index = (n - 1) % digit_len

    return int(str(num)[digit_index])

# Correct: Use proper bounds checking
def findNthDigit(n):
    digit_len = 1
    count = 9
    start = 1

    while n > digit_len * count:
        n -= digit_len * count
        digit_len += 1
        count *= 10
        start *= 10

    num = start + (n - 1) // digit_len
    digit_index = (n - 1) % digit_len

    return int(str(num)[digit_index])
```

### Mistake 3: Not considering single-digit range

```python
# Wrong: Doesn't handle n <= 9 specially (works but inefficient)
def findNthDigit(n):
    if n < 10:
        return n  # Optimization for single digits

    digit_len = 1
    count = 9
    start = 1

    while n > digit_len * count:
        n -= digit_len * count
        digit_len += 1
        count *= 10
        start *= 10

    num = start + (n - 1) // digit_len
    digit_index = (n - 1) % digit_len

    return int(str(num)[digit_index])

# Correct: General solution handles all cases
def findNthDigit(n):
    digit_len = 1
    count = 9
    start = 1

    while n > digit_len * count:
        n -= digit_len * count
        digit_len += 1
        count *= 10
        start *= 10

    num = start + (n - 1) // digit_len
    digit_index = (n - 1) % digit_len

    return int(str(num)[digit_index])
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Find nth character | Include alphabet characters in sequence | Medium |
| Reverse lookup | Given a digit and position, find what number it came from | Medium |
| Range sum | Sum of all digits from position i to j | Hard |
| Skip multiples | Nth digit skipping multiples of k | Hard |
| Different base | Nth digit in base-k number system | Medium |

## Practice Checklist

- [ ] First attempt (solve independently)
- [ ] Work through examples manually with digit counting
- [ ] Implement mathematical solution
- [ ] Test edge cases (n=1, n=9, n=10, n=11, large n)
- [ ] Practice after 1 day
- [ ] Practice after 3 days
- [ ] Practice after 1 week

**Strategy**: See [Mathematical Patterns](../strategies/patterns/mathematical-thinking.md)
