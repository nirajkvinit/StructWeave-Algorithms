---
id: M564
old_id: A456
slug: add-to-array-form-of-integer
title: Add to Array-Form of Integer
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Add to Array-Form of Integer

## Problem

Imagine you're implementing a calculator for numbers so large they don't fit in standard integer types - numbers with thousands of digits, like those used in cryptography. Instead of storing these numbers as single integers, you represent them as arrays where each position holds one digit.

You're given a large number represented as an array `num`, where each element is a single digit (0-9) and the digits appear in order from most significant to least significant. For example, the number `1321` is represented as `[1,3,2,1]`.

Your task is to add another integer `k` to this array-form number and return the sum, also in array form.

The challenge: you can't just convert the array to a regular integer, add `k`, and convert back - the numbers might be too large for standard integer types. You need to perform the addition digit by digit, just like you learned to add numbers by hand in elementary school, carrying values from right to left.


## Why This Matters

Array-form arithmetic is fundamental to handling arbitrarily large numbers in software systems. This exact technique powers big integer libraries used in cryptography (RSA encryption routinely uses 2048-bit numbers), financial systems (handling currency with extreme precision), scientific computing (astronomical distances and quantum measurements), and blockchain technology (cryptocurrency addresses and hash values). Languages like Python hide this complexity with built-in big integers, but understanding digit-by-digit arithmetic helps you implement efficient numerical systems in languages that don't have this feature, optimize precision-critical calculations, and solve problems where you need to process numbers that exceed your platform's maximum integer size.

## Examples

**Example 1:**
- Input: `num = [1,2,0,0], k = 34`
- Output: `[1,2,3,4]`
- Explanation: 1200 + 34 = 1234

**Example 2:**
- Input: `num = [2,7,4], k = 181`
- Output: `[4,5,5]`
- Explanation: 274 + 181 = 455

**Example 3:**
- Input: `num = [2,1,5], k = 806`
- Output: `[1,0,2,1]`
- Explanation: 215 + 806 = 1021

## Constraints

- 1 <= num.length <= 10⁴
- 0 <= num[i] <= 9
- num does not contain any leading zeros except for the zero itself.
- 1 <= k <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Treat k as a carry value that propagates through the array from right to left. You don't need to convert k to an array - just add it digit by digit as you process the array in reverse.
</details>

<details>
<summary>🎯 Main Approach</summary>
Iterate from the end of the array backwards. At each position, add the current carry (initially k) to the digit. The new digit is (sum % 10), and the new carry is (sum // 10). Continue until both the array is exhausted and carry becomes 0.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Build the result in reverse order and reverse it at the end, or prepend digits. If carry remains after processing all array elements, keep extracting digits from carry (carry % 10) and updating (carry // 10) until carry becomes 0.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Convert Both to Integers | O(N) | O(N) | Risk of integer overflow for large inputs |
| Optimal (Digit-by-Digit) | O(max(N, log K)) | O(max(N, log K)) | N = array length, log K = digits in k |

## Common Mistakes

1. **Integer Overflow with Conversion**
   ```python
   # Wrong: Converting to integer can overflow
   def addToArrayForm(num, k):
       number = int(''.join(map(str, num)))
       result = number + k  # May overflow!
       return [int(d) for d in str(result)]

   # Correct: Process digit by digit
   def addToArrayForm(num, k):
       result = []
       for i in range(len(num) - 1, -1, -1):
           k, digit = divmod(k + num[i], 10)
           result.append(digit)
       while k:
           k, digit = divmod(k, 10)
           result.append(digit)
       return result[::-1]
   ```

2. **Forgetting Remaining Carry**
   ```python
   # Wrong: Not handling carry after array ends
   for i in range(len(num) - 1, -1, -1):
       carry += num[i]
       result.append(carry % 10)
       carry //= 10
   # Missing: while carry > 0 loop

   # Correct: Process remaining carry
   for i in range(len(num) - 1, -1, -1):
       carry += num[i]
       result.append(carry % 10)
       carry //= 10
   while carry:
       result.append(carry % 10)
       carry //= 10
   return result[::-1]
   ```

3. **Not Reversing Result**
   ```python
   # Wrong: Building result backwards but not reversing
   result = []
   for i in range(len(num) - 1, -1, -1):
       # ... append to result
   return result  # Wrong order!

   # Correct: Reverse the result
   return result[::-1]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Add Two Numbers (Linked List) | Medium | Addition with two linked lists instead of array + integer |
| Plus One | Easy | Special case where k = 1 |
| Multiply Strings | Medium | Multiplication instead of addition |
| Add Binary | Easy | Binary string addition instead of decimal |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Array Manipulation](../../strategies/fundamentals/array-manipulation.md)
