---
id: E055
old_id: F136
slug: single-number
title: Single Number
difficulty: easy
category: easy
topics: ["array", "bit-manipulation"]
patterns: ["bit-manipulation", "xor"]
estimated_time_minutes: 15
frequency: high
related_problems: ["M137", "M260", "E136"]
prerequisites: ["arrays", "xor-properties", "bit-manipulation"]
strategy_ref: ../strategies/fundamentals/bit-manipulation.md
---
# Single Number

## Problem

Given an array of integers where every element appears exactly twice except for one element which appears only once, find that single element.

The challenge here is not just finding the answer, but doing it efficiently. You need to solve this in linear time O(n) and use only constant extra space O(1). This means you cannot use a hash map or set to track which numbers you've seen, as that would use O(n) space.

**Watch out for:** You must handle negative numbers correctly. Your solution should work whether the array contains all positive numbers, all negative numbers, or a mix.

The key insight involves thinking about the binary representation of numbers and how certain bitwise operations have special properties when applied to identical values.

## Why This Matters

This problem teaches the XOR bitwise operation, which has powerful cancellation properties used in:
- Error detection and correction (parity bits in network protocols)
- Data compression algorithms (finding unique elements without extra storage)
- Cryptography (one-time pads rely on XOR properties)
- Memory-efficient deduplication in distributed systems

Mastering bit manipulation unlocks a category of problems where you need to optimize space to O(1) by exploiting mathematical properties of binary operations. This pattern appears frequently in system design interviews where memory constraints matter.

## Examples

**Example 1:**
- Input: `nums = [2,2,1]`
- Output: `1`

**Example 2:**
- Input: `nums = [4,1,2,1,2]`
- Output: `4`

**Example 3:**
- Input: `nums = [1]`
- Output: `1`

## Constraints

- 1 <= nums.length <= 3 * 10⁴
- -3 * 10⁴ <= nums[i] <= 3 * 10⁴
- Each element in the array appears twice except for one element which appears only once.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: XOR Properties</summary>

Think about the XOR (exclusive OR) operation. It has some special properties:
- a ^ a = 0 (any number XOR itself is 0)
- a ^ 0 = a (any number XOR 0 is itself)
- XOR is commutative and associative: a ^ b ^ c = a ^ c ^ b

What happens if you XOR all numbers in the array together?

</details>

<details>
<summary>🎯 Hint 2: Cancellation Pattern</summary>

Since every number except one appears exactly twice, when you XOR all numbers:
- All pairs cancel out to 0 (because a ^ a = 0)
- You're left with: 0 ^ single_number = single_number

Example: [4,1,2,1,2]
- 4 ^ 1 ^ 2 ^ 1 ^ 2
- = 4 ^ (1 ^ 1) ^ (2 ^ 2)
- = 4 ^ 0 ^ 0
- = 4

Can you implement this in one pass with O(1) space?

</details>

<details>
<summary>📝 Hint 3: Implementation</summary>

```
function singleNumber(nums):
    result = 0

    for num in nums:
        result = result ^ num  # or result ^= num

    return result
```

That's it! The XOR of all elements gives you the single number.

Why does this work?
- Pairs cancel: a ^ a = 0
- Order doesn't matter: XOR is commutative
- Identity: 0 ^ a = a

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Hash Set | O(n) | O(n) | Store all elements, remove duplicates |
| Sorting | O(n log n) | O(1) | Sort, check adjacent pairs |
| Math (2*sum - sum) | O(n) | O(n) | 2*(sum of unique) - sum of all |
| **XOR** | **O(n)** | **O(1)** | Optimal: single pass, constant space |

## Common Mistakes

### 1. Using hash set (suboptimal space)
```python
# WORKS but uses O(n) space
def singleNumber(nums):
    seen = set()
    for num in nums:
        if num in seen:
            seen.remove(num)
        else:
            seen.add(num)
    return seen.pop()

# BETTER: O(1) space with XOR
def singleNumber(nums):
    result = 0
    for num in nums:
        result ^= num
    return result
```

### 2. Not understanding XOR cancellation
```python
# WRONG: Trying to track counts
def singleNumber(nums):
    count = {}
    for num in nums:
        count[num] = count.get(num, 0) + 1
    for num, cnt in count.items():
        if cnt == 1:
            return num
# Works but O(n) space

# CORRECT: XOR approach
def singleNumber(nums):
    return reduce(lambda x, y: x ^ y, nums, 0)
# or simply: reduce(operator.xor, nums)
```

### 3. Forgetting XOR properties apply to negative numbers
```python
# CORRECT: XOR works with negative numbers too
def singleNumber(nums):
    result = 0
    for num in nums:
        result ^= num
    return result
# No special handling needed for negatives
# -3 ^ -3 = 0, same as positive numbers
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Single Number II | Elements appear 3 times except one | Use bit counting modulo 3 or state machine |
| Single Number III | Two elements appear once | XOR all, then partition by any set bit |
| Missing number | Find missing from 0 to n | XOR all numbers with 0 to n |
| K appearances | All but one appear k times | Generalized bit counting modulo k |
| Multiple singles | m elements appear once (m known) | Partition based on XOR result |

## Practice Checklist

**Correctness:**
- [ ] Handles single element array
- [ ] Handles negative numbers
- [ ] Handles zeros in array
- [ ] Returns correct single number
- [ ] Works with large arrays

**Interview Readiness:**
- [ ] Can explain XOR properties in 2 minutes
- [ ] Can code solution in 3 minutes
- [ ] Can extend to Single Number II (3 appearances)
- [ ] Can explain why space is O(1)

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve Single Number II variation
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Bit Manipulation Pattern](../../strategies/fundamentals/bit-manipulation.md)
