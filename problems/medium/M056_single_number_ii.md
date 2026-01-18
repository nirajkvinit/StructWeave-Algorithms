---
id: M056
old_id: F137
slug: single-number-ii
title: Single Number II
difficulty: medium
category: medium
topics: ["array", "bit-manipulation"]
patterns: ["bit-manipulation", "counting"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E136", "M260", "M137"]
prerequisites: ["bit-manipulation", "bitwise-operators"]
strategy_ref: ../strategies/patterns/bit-manipulation.md
---
# Single Number II

## Problem

You're given an array of integers where every element appears exactly three times except for one element that appears exactly once. Your task is to find that unique element using only constant extra space. The straightforward approach using a hash map works but uses O(n) space. The challenge is leveraging bit manipulation to solve this with O(1) space. Think about how numbers are represented in binary: each integer is 32 bits. If you count how many times each bit position is set across all numbers, bits that appear in the triplicate numbers contribute counts divisible by 3. The single number contributes an extra 1 to certain bit positions, making those counts not divisible by 3. For example, with [2,2,3,2], analyzing bit patterns reveals which bits belong to the unique number. Edge cases include negative numbers (requiring careful handling of two's complement representation) and arrays where the single number is 0.

## Why This Matters

This problem demonstrates low-level bit manipulation techniques used in embedded systems, cryptography, and data compression where memory is constrained. The pattern of analyzing data bit-by-bit appears in error detection and correction codes, checksum algorithms, and digital signal processing. Understanding how to use modular arithmetic with bits is fundamental to building state machines in hardware design, implementing efficient hash functions, and optimizing performance-critical code where every byte matters. This also teaches you how to think about numbers at the binary level rather than as abstract integers, a crucial skill for systems programming and understanding computer architecture.

## Examples

**Example 1:**
- Input: `nums = [2,2,3,2]`
- Output: `3`

**Example 2:**
- Input: `nums = [0,1,0,1,0,1,99]`
- Output: `99`

## Constraints

- 1 <= nums.length <= 3 * 10⁴
- -2³¹ <= nums[i] <= 2³¹ - 1
- Each element in nums appears exactly **three times** except for one element which appears **once**.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Bit-by-Bit Analysis</summary>

Consider each bit position (0-31) independently. For numbers appearing three times, each bit position will have a count that's a multiple of 3. The single number contributes an extra 1 to certain bit positions. What if you count occurrences of each bit across all numbers?

</details>

<details>
<summary>🎯 Hint 2: Modulo 3 Counting</summary>

For each of the 32 bit positions, count how many numbers have that bit set. If the count is not divisible by 3, the single number has that bit set. Build the result by setting bits where count % 3 != 0. This works because 3 × k + 0 or 1 reveals the single number's contribution.

</details>

<details>
<summary>📝 Hint 3: Two Approaches</summary>

**Approach 1: Count Bits (Easier to understand)**
```
result = 0
for each bit position i from 0 to 31:
    count = 0
    for each number in nums:
        if bit i is set in number:
            count++
    if count % 3 != 0:
        set bit i in result
return result
```

**Approach 2: State Machine (O(1) space, more elegant)**
Use two variables (ones, twos) to track bits seen once and twice.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Hash Map Counting | O(n) | O(n) | Simple but uses extra space |
| Sorting | O(n log n) | O(1) | Not optimal time complexity |
| **Bit Counting** | **O(32n) = O(n)** | **O(1)** | Count each of 32 bits |
| **Bit State Machine** | **O(n)** | **O(1)** | Most elegant, uses ones/twos variables |

## Common Mistakes

### 1. Using Hash Map When Bit Manipulation Required
```python
# WRONG: Uses O(n) space when O(1) is achievable
def singleNumber(nums):
    count = {}
    for num in nums:
        count[num] = count.get(num, 0) + 1
    for num, freq in count.items():
        if freq == 1:
            return num

# CORRECT: Bit counting approach
def singleNumber(nums):
    result = 0
    for i in range(32):
        bit_count = 0
        for num in nums:
            bit_count += (num >> i) & 1
        if bit_count % 3 != 0:
            result |= (1 << i)
    # Handle negative numbers (two's complement)
    if result >= 2**31:
        result -= 2**32
    return result
```

### 2. Forgetting Negative Number Handling
```python
# WRONG: Doesn't handle negative numbers correctly
def singleNumber(nums):
    result = 0
    for i in range(32):
        bit_count = sum((num >> i) & 1 for num in nums)
        if bit_count % 3 != 0:
            result |= (1 << i)
    return result  # Wrong for negative numbers!

# CORRECT: Convert from two's complement if needed
def singleNumber(nums):
    result = 0
    for i in range(32):
        bit_count = sum((num >> i) & 1 for num in nums)
        if bit_count % 3 != 0:
            result |= (1 << i)
    # If MSB is set, it's a negative number in two's complement
    if result >= 2**31:
        result -= 2**32
    return result
```

### 3. Incorrect State Machine Logic
```python
# WRONG: Incorrect state transitions
def singleNumber(nums):
    ones = twos = 0
    for num in nums:
        ones = ones ^ num  # Too simple, doesn't track properly
        twos = twos ^ num
    return ones

# CORRECT: Proper state machine
def singleNumber(nums):
    ones = twos = 0
    for num in nums:
        # Update twos: bits that appeared second time
        twos |= ones & num
        # Update ones: bits that appeared odd times
        ones ^= num
        # Remove bits that appeared three times
        threes = ones & twos
        ones &= ~threes
        twos &= ~threes
    return ones
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Single Number (E136) | Others appear twice | Use simple XOR: a ^ a = 0 |
| Single Number III (M260) | Two singles, others twice | XOR to find bits differing between the two |
| Majority Element | Appears > n/2 times | Boyer-Moore voting algorithm |
| K Times vs Once | Others appear k times | Generalize: count % k |
| Multiple Singles | M singles, others n times | More complex state tracking |

## Practice Checklist

- [ ] Handles negative numbers correctly
- [ ] Can explain bit counting approach in 2 min
- [ ] Can code bit counting solution in 15 min
- [ ] Can implement state machine version
- [ ] Understands two's complement for negative numbers

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Bit Manipulation Patterns](../../strategies/patterns/bit-manipulation.md)
