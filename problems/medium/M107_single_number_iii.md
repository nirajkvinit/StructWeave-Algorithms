---
id: M107
old_id: I060
slug: single-number-iii
title: Single Number III
difficulty: medium
category: medium
topics: ["array", "bit-manipulation"]
patterns: ["xor", "bit-manipulation"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E136", "E137", "M201"]
prerequisites: ["bit-manipulation", "xor-properties", "bit-masking"]
---
# Single Number III

## Problem

Given an array of integers where exactly two numbers appear once and all other numbers appear exactly twice, find those two unique numbers. The constraint that makes this challenging is that you must solve it in linear time with only constant extra space, meaning you can't use a hash set to track which numbers you've seen. This is an advanced bit manipulation problem building on the simpler "Single Number" problem. The key insight involves using XOR properties: when you XOR all numbers together, pairs cancel out, leaving you with `x ^ y` where x and y are the two unique numbers. The challenge is then separating x and y from this combined XOR result. You'll need to find a bit position where x and y differ, then use that bit to partition all numbers into two groups. Edge cases include arrays with just two elements, negative numbers, and zeros.

## Why This Matters

Bit manipulation techniques are essential in systems programming and embedded software where memory is constrained. Error detection in network protocols uses XOR properties to identify corrupted data packets without storing complete checksums. Cryptographic algorithms employ bit-level operations for efficiency and security. In hardware design, finding differing bits is fundamental to comparator circuits and parity checking. Database systems use similar techniques for fast duplicate detection in de-duplication systems. The ability to solve problems with constant space using bit tricks is valued in high-frequency trading systems and real-time processing where every byte of memory matters. This problem teaches you creative problem-solving using mathematical properties of bitwise operations, a skill that distinguishes experienced engineers in performance-critical applications.

## Examples

**Example 1:**
- Input: `nums = [1,2,1,3,2,5]`
- Output: `[3,5]
**Explanation: ** [5, 3] is also a valid answer.`

**Example 2:**
- Input: `nums = [-1,0]`
- Output: `[-1,0]`

**Example 3:**
- Input: `nums = [0,1]`
- Output: `[1,0]`

## Constraints

- 2 <= nums.length <= 3 * 10⁴
- -2³¹ <= nums[i] <= 2³¹ - 1
- Each integer in nums will appear twice, only two integers will appear once.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: XOR Property Review</summary>

Recall that XOR has useful properties: a ^ a = 0, a ^ 0 = a, and XOR is commutative/associative. If you XOR all numbers together, what do you get? The pairs cancel out, leaving x ^ y where x and y are the two unique numbers.

</details>

<details>
<summary>🎯 Hint 2: Separating the Two Numbers</summary>

After getting xor_result = x ^ y, you need to separate x and y. Find any bit position where x and y differ (where xor_result has a 1 bit). Use this bit to partition all numbers into two groups: one group where this bit is set, another where it's not. Each unique number will be in a different group.

</details>

<details>
<summary>📝 Hint 3: Algorithm Design</summary>

Pseudocode approach:
```
# Step 1: XOR all numbers to get x ^ y
xor_all = 0
for num in nums:
    xor_all ^= num

# Step 2: Find a bit where x and y differ
# Get rightmost set bit (any set bit works)
diff_bit = xor_all & (-xor_all)

# Step 3: Partition numbers into two groups and XOR each
x, y = 0, 0
for num in nums:
    if num & diff_bit:
        x ^= num  # Group 1: bit is set
    else:
        y ^= num  # Group 2: bit is not set

return [x, y]

# Why this works:
# - Numbers appearing twice will be in same group and cancel out
# - x and y are in different groups (they differ at diff_bit position)
# - Each group XOR gives the unique number in that group
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Hash Set | O(n) | O(n) | Store all numbers, find ones appearing once |
| Sorting | O(n log n) | O(1) | Sort and scan for singles |
| **XOR Bit Manipulation** | **O(n)** | **O(1)** | Two passes, constant extra space |

Where n is the length of the array.

## Common Mistakes

**Mistake 1: Not finding the rightmost set bit correctly**
```python
# Wrong: Trying to find diff bit incorrectly
def single_number(nums):
    xor_all = 0
    for num in nums:
        xor_all ^= num

    # Wrong way to find a set bit
    diff_bit = 1
    while not (xor_all & diff_bit):
        diff_bit <<= 1  # Works but inefficient

    # ... rest of code
```

```python
# Correct: Use bit trick to get rightmost set bit
def single_number(nums):
    xor_all = 0
    for num in nums:
        xor_all ^= num

    # Get rightmost set bit: x & (-x)
    diff_bit = xor_all & (-xor_all)

    x, y = 0, 0
    for num in nums:
        if num & diff_bit:
            x ^= num
        else:
            y ^= num

    return [x, y]
```

**Mistake 2: Not partitioning correctly**
```python
# Wrong: Doesn't partition all numbers
def single_number(nums):
    xor_all = 0
    for num in nums:
        xor_all ^= num

    diff_bit = xor_all & (-xor_all)

    x = 0
    # Wrong: Only processes some numbers
    for num in nums:
        if num & diff_bit:
            x ^= num

    return [x, xor_all ^ x]  # Clever but misses the point
```

```python
# Correct: Partition all numbers into two groups
def single_number(nums):
    xor_all = 0
    for num in nums:
        xor_all ^= num

    diff_bit = xor_all & (-xor_all)

    x, y = 0, 0
    for num in nums:
        if num & diff_bit:
            x ^= num
        else:
            y ^= num

    return [x, y]
```

**Mistake 3: Forgetting XOR cancellation property**
```python
# Wrong: Tries to use hash set (violates O(1) space requirement)
def single_number(nums):
    seen = set()
    for num in nums:
        if num in seen:
            seen.remove(num)
        else:
            seen.add(num)
    return list(seen)
```

```python
# Correct: Uses XOR bit manipulation for O(1) space
def single_number(nums):
    xor_all = 0
    for num in nums:
        xor_all ^= num

    diff_bit = xor_all & (-xor_all)

    x, y = 0, 0
    for num in nums:
        if num & diff_bit:
            x ^= num
        else:
            y ^= num

    return [x, y]
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Single Number I | Find one number appearing once, rest twice | Easy |
| Single Number II | Find one number appearing once, rest thrice | Medium |
| Single Number IV | Find k numbers appearing once, rest twice | Hard |
| Missing Number | Find missing number in range [0, n] | Easy |
| Find Duplicate | Find one duplicate number in array | Medium |

## Practice Checklist

- [ ] Initial attempt (Day 0)
- [ ] Reviewed XOR properties (Day 0)
- [ ] Implemented bit partitioning approach (Day 0)
- [ ] First spaced repetition (Day 1)
- [ ] Second spaced repetition (Day 3)
- [ ] Third spaced repetition (Day 7)
- [ ] Fourth spaced repetition (Day 14)
- [ ] Can explain rightmost set bit trick (Day 14)
- [ ] Can code without references (Day 30)
- [ ] Interview-ready confidence (Day 30)

**Strategy**: XOR all numbers to get x^y, find a differing bit, partition numbers by that bit, XOR each partition to isolate the two unique numbers.
