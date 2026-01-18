---
id: E152
old_id: I214
slug: add-strings
title: Add Strings
difficulty: easy
category: easy
topics: ["string", "math", "simulation"]
patterns: ["digit-manipulation", "carry-propagation"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E002", "E066", "E067"]
prerequisites: ["string-manipulation", "carry-arithmetic", "digit-conversion"]
strategy_ref: ../strategies/patterns/string-manipulation.md
---
# Add Strings

## Problem

You are given two non-negative integers represented as strings. Your task is to add these numbers together and return the result as a string, without using any built-in big integer libraries or converting the entire strings to integer types directly.

The challenge mimics how you would perform addition manually with pencil and paper: process digits from right to left (least significant to most significant), adding corresponding digits along with any carry from the previous position. For each position, the sum of two digits plus carry can range from 0 to 19 (maximum: 9 + 9 + 1 carry). Extract the ones place as the result digit and the tens place as the carry to the next position.

The strings can have different lengths, so you'll need to handle cases where one string is exhausted before the other. Treat missing digits as zero. For example, when adding "123" and "99", when you reach the leftmost position, "123" still has a '1' but "99" is exhausted, so you add 1 + 0 + carry. A critical edge case is the final carry: "99" + "1" produces "100", not "00" – you must append the final carry if it exists after processing all digits.

You'll build the result string in reverse order (since you process right-to-left but construct the result left-to-right), then reverse it at the end. Alternatively, you can prepend each digit, though this is less efficient in some languages. Convert individual characters to digits using character arithmetic (like `int(char)` or `char - '0'`), and convert result digits back to characters for the output string.

## Why This Matters

Implementing arithmetic operations on string representations teaches you how computers handle numbers larger than built-in types can store, essential for cryptography (RSA key operations), financial applications (currency calculations requiring arbitrary precision), scientific computing (astronomical calculations), and competitive programming (problems with 100-digit numbers). This pattern appears in implementing your own BigInteger class, building calculators, processing numeric data from text files, and educational software teaching elementary arithmetic.

The digit-by-digit processing with carry propagation is fundamental to understanding how CPUs perform addition at the hardware level using full adders in binary. The algorithm generalizes to other bases: the same pattern works for adding binary strings, hexadecimal strings, or any base. This problem teaches important string manipulation patterns: iterating backwards, building results in reverse, handling strings of different lengths, and character-to-digit conversion. These techniques apply to parsing numbers from text, implementing custom numeric formats, and validating input data. Interview questions favor this problem because it has clear requirements, tests edge case handling (different lengths, carries, leading zeros), and naturally extends to follow-up questions about multiplication, subtraction, or different bases.

## Examples

**Example 1:**
- Input: `num1 = "11", num2 = "123"`
- Output: `"134"`
- Explanation: 11 + 123 = 134

**Example 2:**
- Input: `num1 = "456", num2 = "77"`
- Output: `"533"`
- Explanation: 456 + 77 = 533

**Example 3:**
- Input: `num1 = "0", num2 = "0"`
- Output: `"0"`
- Explanation: 0 + 0 = 0

## Constraints

- 1 <= num1.length, num2.length <= 10⁴
- num1 and num2 consist of only digits.
- num1 and num2 don't have any leading zeros except for the zero itself.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Right-to-Left Digit Addition
Process the strings from right to left (least significant digit first), just like manual addition. Use two pointers starting at the end of each string. For each position, convert characters to digits, add them with any carry from the previous position, then append the result digit. Continue until both strings are exhausted and no carry remains.

**Key insight**: Mimic elementary school addition algorithm - process from right to left, maintaining carry.

### Intermediate Approach - Handle Unequal Lengths
When strings have different lengths, continue processing even after one string is exhausted. Use 0 for the exhausted string's digits. Track carry separately and handle the final carry after all digits are processed. Build the result in reverse order (since we process right-to-left) and reverse it at the end, or prepend to result.

**Key insight**: The key variables are: two pointers, carry (0 or 1), and building result in reverse.

### Advanced Approach - Optimized Single Pass
Combine pointer management into a single loop condition. Use index variables that start from string lengths minus 1 and decrement. Continue while either index is valid or carry exists. Calculate `digit = (num1[i] if i >= 0 else 0) + (num2[j] if j >= 0 else 0) + carry`. Use integer division and modulo for carry and digit extraction.

**Key insight**: Unified loop condition `while i >= 0 or j >= 0 or carry` handles all cases elegantly.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Digit-by-digit | O(max(m, n)) | O(max(m, n)) | m, n are string lengths, result length |
| Two-pointer | O(max(m, n)) | O(max(m, n)) | Same, different implementation style |
| StringBuilder | O(max(m, n)) | O(max(m, n)) | Efficient string building in some languages |

Linear time in the length of the longer string is optimal.

## Common Mistakes

### Mistake 1: Not Handling Final Carry
```python
# Wrong: Ignoring carry after loop
def addStrings(num1, num2):
    i, j = len(num1) - 1, len(num2) - 1
    carry = 0
    result = []

    while i >= 0 or j >= 0:
        d1 = int(num1[i]) if i >= 0 else 0
        d2 = int(num2[j]) if j >= 0 else 0
        total = d1 + d2 + carry
        result.append(str(total % 10))
        carry = total // 10
        i -= 1
        j -= 1

    return ''.join(result[::-1])  # Missing final carry
```

**Why it fails**: For `"99" + "1"`, produces "00" instead of "100". The final carry is dropped.

**Fix**: After loop, check carry: `if carry: result.append('1')` before reversing.

### Mistake 2: Not Reversing Result
```python
# Wrong: Forgetting to reverse
def addStrings(num1, num2):
    # ... loop builds result right-to-left
    return ''.join(result)  # Returns reversed answer
```

**Why it fails**: For `"123" + "456"`, returns "975" instead of "579" if you build right-to-left without reversing.

**Fix**: Reverse the result: `return ''.join(result[::-1])` or build in correct order with prepending.

### Mistake 3: Converting Entire String to Integer
```python
# Wrong: Using built-in conversion (violates constraint)
def addStrings(num1, num2):
    return str(int(num1) + int(num2))  # Not allowed
```

**Why it fails**: Problem explicitly forbids converting strings to integers directly. This doesn't demonstrate understanding of digit-by-digit arithmetic.

**Fix**: Implement manual digit-by-digit addition with proper carry handling.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Multiply Strings | Medium | Multiply two numbers represented as strings |
| Subtract Strings | Easy | Subtract two string numbers (handle negative results) |
| Add Binary Strings | Easy | Same problem but for binary strings (base 2) |
| Add in Base K | Medium | Generalize to addition in any base k |
| Add Linked List Numbers | Medium | Numbers stored as linked lists instead of strings |

## Practice Checklist

Track your progress on this problem:

- [ ] **Day 0**: Solve with basic right-to-left addition (25 min)
- [ ] **Day 1**: Review edge cases (different lengths, final carry, single digit)
- [ ] **Day 3**: Implement without looking at previous solution (15 min)
- [ ] **Day 7**: Solve add binary variation to reinforce pattern (20 min)
- [ ] **Day 14**: Explain carry propagation mechanism (10 min)
- [ ] **Day 30**: Speed solve in under 10 minutes

**Strategy**: See [String Manipulation](../strategies/patterns/string-manipulation.md)
