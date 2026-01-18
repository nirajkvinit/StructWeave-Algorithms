---
id: E146
old_id: I204
slug: convert-a-number-to-hexadecimal
title: Convert a Number to Hexadecimal
difficulty: easy
category: easy
topics: ["string", "bit-manipulation"]
patterns: ["bit-manipulation", "base-conversion"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E134", "E152", "M001"]
prerequisites: ["bit-manipulation", "two's-complement", "string-manipulation"]
strategy_ref: ../strategies/patterns/bit-manipulation.md
---
# Convert a Number to Hexadecimal

## Problem

Given an integer (which may be positive, negative, or zero), convert it to hexadecimal representation and return the result as a string. Hexadecimal is base-16, using digits 0-9 for values 0-9 and letters a-f for values 10-15. Each hexadecimal digit represents exactly 4 binary bits.

For negative numbers, you must use two's complement representation, which is how computers internally store negative integers in fixed-width formats. In two's complement, -1 becomes all 1 bits in binary. For a 32-bit integer, -1 in binary is 32 ones, which converts to "ffffffff" in hexadecimal (eight f's, since each f represents four 1 bits).

Your output must use lowercase letters for hex digits a-f, must not include any leading zeros (except when the number itself is zero, which returns "0"), and you cannot use built-in conversion functions. You'll need to extract groups of 4 bits at a time, map each group to its corresponding hex character, and handle the special case where negative numbers are already in the correct bit pattern due to two's complement. The constraint that you cannot use built-in functions means you must implement the bit extraction and character mapping yourself.

## Why This Matters

Base conversion and bit manipulation are foundational skills for low-level programming, systems development, and understanding how computers represent data. This problem teaches you how hexadecimal serves as a human-readable representation of binary data, essential when debugging memory dumps, reading machine code, working with color codes in graphics programming (like #FF5733), or analyzing network protocols. The two's complement handling demonstrates why understanding binary representation matters when working with signed integers, networking checksums, and cryptographic operations. This pattern of extracting fixed-bit groups appears frequently in encoding schemes (Base64, UTF-8), hash functions, and data serialization. Mastering bit manipulation makes you more effective at optimization, embedded systems, and understanding what happens beneath high-level abstractions.

## Examples

**Example 1:**
- Input: `num = 26`
- Output: `"1a"`

**Example 2:**
- Input: `num = -1`
- Output: `"ffffffff"`

## Constraints

- -2³¹ <= num <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Character Mapping & Bit Extraction
Start by understanding the relationship between binary and hexadecimal. Each hex digit represents exactly 4 bits. Think about how to extract groups of 4 bits from the number and map them to hex characters ('0'-'9', 'a'-'f'). For negative numbers, consider that two's complement representation in a 32-bit integer already gives you the correct bit pattern.

**Key insight**: Process 4 bits at a time from right to left, converting each group to its hex character.

### Intermediate Approach - Bitwise Operations
Use bitwise AND with mask `0xF` (binary 1111) to extract the last 4 bits, convert to hex character, then shift right by 4 bits. Repeat until all significant bits are processed. Handle the special case of zero separately.

**Key insight**: Mask and shift operations naturally group bits into hex digits without arithmetic division.

### Advanced Approach - Optimized Single Pass
Recognize that for 32-bit integers, you'll process at most 8 hex digits. Use unsigned right shift to handle negative numbers correctly. Build the result string efficiently by either prepending characters or building reversed and flipping at the end.

**Key insight**: Treating the number as unsigned 32-bit eliminates special negative handling - two's complement representation is already correct.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Bit Extraction | O(1) | O(1) | Fixed 8 iterations max for 32-bit int |
| Repeated Division | O(1) | O(1) | Alternative approach, same bounds |
| Lookup Table | O(1) | O(1) | Constant space for 16-char lookup |

All approaches are O(1) because we process a fixed maximum of 32 bits (8 hex digits).

## Common Mistakes

### Mistake 1: Incorrect Negative Number Handling
```python
# Wrong: Using absolute value loses two's complement
def toHex(num):
    if num < 0:
        num = abs(num)  # This breaks two's complement!
    # ... conversion logic
```

**Why it fails**: For `-1`, you'd convert `1` instead of getting `"ffffffff"`. Negative numbers must use two's complement representation.

**Fix**: Treat negative numbers as unsigned 32-bit by adding `2^32` or using bitwise operations with proper masking.

### Mistake 2: Leading Zeros in Result
```python
# Wrong: Not handling leading zeros
def toHex(num):
    result = ""
    for i in range(8):  # Always 8 digits
        result = hex_chars[num & 0xF] + result
        num >>= 4
    return result  # Returns "0000001a" for 26
```

**Why it fails**: Returns unnecessary leading zeros like `"0000001a"` instead of `"1a"`.

**Fix**: Stop processing when num becomes 0, or strip leading zeros from the final result.

### Mistake 3: Incorrect Shift for Negative Numbers
```python
# Wrong: Using arithmetic shift on negative numbers
def toHex(num):
    while num != 0:
        digit = num & 0xF
        result = hex_chars[digit] + result
        num >>= 4  # In some languages, this is arithmetic shift
    return result or "0"
```

**Why it fails**: Arithmetic right shift on negative numbers extends the sign bit, creating infinite loop.

**Fix**: Ensure unsigned right shift or use iteration counter (max 8 times for 32-bit).

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Binary String Conversion | Easy | Convert integer to binary string representation |
| Octal Conversion | Easy | Convert to base-8 instead of base-16 |
| Custom Base Conversion | Medium | Convert to any base from 2 to 36 |
| 64-bit Hex Conversion | Medium | Handle 64-bit integers (16 hex digits) |
| Hex to Integer | Easy | Reverse problem: parse hex string to integer |

## Practice Checklist

Track your progress on this problem:

- [ ] **Day 0**: Solve using basic bit extraction (30 min)
- [ ] **Day 1**: Review and optimize for edge cases (zero, -1, max/min int)
- [ ] **Day 3**: Implement without looking at previous solution (15 min)
- [ ] **Day 7**: Solve both hex and binary conversion (20 min)
- [ ] **Day 14**: Explain approach and handle follow-up questions (10 min)
- [ ] **Day 30**: Speed solve in under 10 minutes

**Strategy**: See [Bit Manipulation](../strategies/patterns/bit-manipulation.md)
