---
id: E103
old_id: I067
slug: missing-number
title: Missing Number
difficulty: easy
category: easy
topics: ["array", "bit-manipulation", "math"]
patterns: ["bit-manipulation", "mathematical"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E268", "M287", "M448"]
prerequisites: ["xor-operation", "gauss-sum"]
strategy_ref: ../strategies/patterns/bit-manipulation.md
---
# Missing Number

## Problem

Given an array containing n distinct numbers from the range [0, n], find the one number that is missing from the array. For example, if the array has length 3, it should contain three numbers from the range [0, 3], meaning one number from this range is absent.

This problem has multiple elegant solutions, each teaching a different technique. The mathematical approach uses Gauss's formula for summing consecutive integers: the sum from 0 to n equals n×(n+1)/2. Calculate what the sum should be, subtract what it actually is, and the difference is your missing number. The bit manipulation approach uses the XOR operation's special property: any number XORed with itself equals zero, and XORing with zero leaves the number unchanged. By XORing all numbers from 0 to n with all numbers in the array, the duplicates cancel out, leaving only the missing number.

Both approaches run in linear time with constant space, but XOR is more elegant and avoids potential integer overflow issues that can occur when summing large numbers.

## Why This Matters

This problem is a masterclass in creative problem-solving with multiple optimal solutions. The mathematical approach demonstrates how formulas can replace iteration, while the XOR solution showcases bit manipulation's power for solving array problems. XOR tricks appear frequently in interview questions involving duplicates, missing elements, and parity checking. Understanding the XOR property (a ^ a = 0, a ^ 0 = a) unlocks solutions to entire families of problems. The mathematical approach reinforces the importance of recognizing arithmetic sequences and leveraging closed-form formulas. Both techniques are fundamental tools in a programmer's toolkit, applicable to systems programming, data deduplication, error detection, and algorithmic optimization.

## Examples

**Example 1:**
- Input: `nums = [3,0,1]`
- Output: `2`
- Explanation: n = 3 since there are 3 numbers, so all numbers are in the range [0,3]. 2 is the missing number in the range since it does not appear in nums.

**Example 2:**
- Input: `nums = [0,1]`
- Output: `2`
- Explanation: n = 2 since there are 2 numbers, so all numbers are in the range [0,2]. 2 is the missing number in the range since it does not appear in nums.

**Example 3:**
- Input: `nums = [9,6,4,2,3,5,7,0,1]`
- Output: `8`
- Explanation: n = 9 since there are 9 numbers, so all numbers are in the range [0,9]. 8 is the missing number in the range since it does not appear in nums.

## Constraints

- n == nums.length
- 1 <= n <= 10⁴
- 0 <= nums[i] <= n
- All the numbers of nums are **unique**.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Mathematical Sum Approach</summary>

The sum of numbers from 0 to n is given by the formula n*(n+1)/2 (Gauss's formula). Calculate the expected sum and the actual sum of the array. The difference is the missing number. This works because all numbers are unique and exactly one is missing.

</details>

<details>
<summary>🎯 Hint 2: XOR Bit Manipulation</summary>

XOR has a special property: a ^ a = 0 and a ^ 0 = a. If you XOR all numbers from 0 to n with all numbers in the array, duplicates cancel out (become 0), leaving only the missing number. This approach is elegant and handles overflow better than sum-based methods.

</details>

<details>
<summary>📝 Hint 3: Multiple Approaches</summary>

Approach 1 (Math):
- expected_sum = n * (n + 1) / 2
- actual_sum = sum(nums)
- return expected_sum - actual_sum

Approach 2 (XOR):
- result = n
- for i in 0..n-1: result ^= i ^ nums[i]
- return result

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Check Each) | O(n²) | O(1) | Search for each i in array |
| Sorting | O(n log n) | O(1) | Sort and scan for gap |
| Hash Set | O(n) | O(n) | Store all numbers, check 0..n |
| **Sum Formula** | **O(n)** | **O(1)** | One pass to sum, constant math |
| **XOR Bit Manipulation** | **O(n)** | **O(1)** | One pass, no overflow risk |

## Common Mistakes

### Mistake 1: Integer Overflow with Sum

```python
# WRONG: Can overflow for large n in languages with fixed-size integers
def missingNumber(nums):
    n = len(nums)
    expected = n * (n + 1) // 2  # May overflow in C++/Java
    actual = sum(nums)
    return expected - actual
```

```python
# CORRECT: Use XOR to avoid overflow
def missingNumber(nums):
    result = len(nums)
    for i, num in enumerate(nums):
        result ^= i ^ num  # XOR cancels out duplicates
    return result
```

### Mistake 2: Wrong Sum Formula

```python
# WRONG: Off-by-one in sum formula
def missingNumber(nums):
    n = len(nums)
    expected = n * n // 2  # Bug: should be n * (n+1) // 2
    actual = sum(nums)
    return expected - actual
```

```python
# CORRECT: Gauss formula is n*(n+1)/2
def missingNumber(nums):
    n = len(nums)
    expected = n * (n + 1) // 2  # Sum of 0..n
    actual = sum(nums)
    return expected - actual
```

### Mistake 3: XOR Logic Error

```python
# WRONG: Not initializing with n
def missingNumber(nums):
    result = 0
    for i in range(len(nums)):
        result ^= i ^ nums[i]
    return result  # Bug: missing the last number n
```

```python
# CORRECT: Initialize with n or XOR 0..n separately
def missingNumber(nums):
    n = len(nums)
    result = n  # Start with n (the highest number in range)
    for i in range(n):
        result ^= i ^ nums[i]
    return result
# Or: result = 0; for i in 0..n: result ^= i; for num in nums: result ^= num
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Find the Duplicate Number | Medium | One duplicate instead of one missing |
| First Missing Positive | Hard | Find smallest positive missing number |
| Find All Numbers Disappeared in Array | Easy | Multiple numbers missing |
| Single Number | Easy | Find unique number among duplicates (XOR) |

## Practice Checklist

- [ ] Day 1: Solve with sum formula (10 min)
- [ ] Day 2: Implement XOR approach (10 min)
- [ ] Day 7: Solve again, compare both methods (10 min)
- [ ] Day 14: Explain why XOR works (5 min)
- [ ] Day 30: Code from memory (5 min)

**Strategy**: See [Bit Manipulation Pattern](../strategies/patterns/bit-manipulation.md)
