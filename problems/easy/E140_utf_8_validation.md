---
id: E140
old_id: I192
slug: utf-8-validation
title: UTF-8 Validation
difficulty: easy
category: easy
topics: ["array", "string", "bit-manipulation"]
patterns: ["state-machine", "bit-masking"]
estimated_time_minutes: 15
frequency: low
related_problems:
  - M271
  - E191
  - M338
prerequisites:
  - bit operations (AND, shift)
  - byte representation
  - state machines
strategy_ref: ../strategies/patterns/bit-manipulation.md
---
# UTF-8 Validation

## Problem

Given an integer array `data` where each element represents one byte (8 bits), determine whether the sequence forms a valid **UTF-8** encoding.

**UTF-8 encoding background:** UTF-8 is a variable-length character encoding that can represent any Unicode character using 1 to 4 bytes. Each byte sequence follows strict bit patterns that you must validate. Characters can occupy different byte counts based on their Unicode value - basic ASCII characters use 1 byte, while characters from other alphabets and symbols use 2-4 bytes.

The encoding follows these specific bit patterns:

**1-byte character:** Starts with `0`, followed by 7 data bits
Format: `0xxxxxxx`

**2-byte character:** First byte starts with `110`, second byte starts with `10`
Format: `110xxxxx 10xxxxxx`

**3-byte character:** First byte starts with `1110`, next two bytes each start with `10`
Format: `1110xxxx 10xxxxxx 10xxxxxx`

**4-byte character:** First byte starts with `11110`, next three bytes each start with `10`
Format: `11110xxx 10xxxxxx 10xxxxxx 10xxxxxx`

Here `x` represents data bits (can be 0 or 1). The bytes starting with `10` are called "continuation bytes" - they can only appear as part of multi-byte characters, never alone.

**Important constraint:** Each integer in the input array uses only its **least significant 8 bits** (rightmost byte), so values above 255 should be masked with `& 0xFF` or `& 0b11111111`.

Your task is to verify that every byte follows these patterns correctly and that continuation bytes appear in the right quantity after leading bytes.

## Why This Matters

Character encoding validation is critical in web browsers (preventing security vulnerabilities from malformed UTF-8), text editors (displaying international text correctly), database systems (ensuring data integrity), network protocols (validating transmitted text), and file parsers (rejecting corrupted files).

This problem teaches bit manipulation with real-world constraints and state machine design. The state machine pattern (tracking "how many continuation bytes am I expecting?") appears frequently in parsing, protocol validation, and finite automata problems. Understanding UTF-8 also gives insight into how computers represent international text, emoji, and special characters using variable-length encodings.

Bit masking skills practiced here transfer directly to problems involving IP address validation, binary protocol parsing, and low-level data manipulation.

## Examples

**Example 1:**
- Input: `data = [197,130,1]`
- Output: `true`
- Explanation: Binary sequence is 11000101 10000010 00000001, representing a valid 2-byte character followed by a 1-byte character.

**Example 2:**
- Input: `data = [235,140,4]`
- Output: `false`
- Explanation: Binary sequence is 11101011 10001100 00000100. The pattern indicates a 3-byte character, and while the first continuation byte is valid (10001100), the second byte (00000100) does not begin with 10.

## Constraints

- 1 <= data.length <= 2 * 10⁴
- 0 <= data[i] <= 255

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Tier 1 Hint - Core Concept
Think about processing the byte sequence as a state machine. For each byte, determine: (1) Is it the start of a new character (1-4 bytes)? or (2) Is it a continuation byte (must start with `10`)? Track how many continuation bytes you're expecting. Use bit masks to check patterns: for example, `byte & 0b10000000 == 0` checks if the leading bit is 0 (1-byte char).

### Tier 2 Hint - Implementation Details
Use bit masking to identify byte types. For leading bytes: `0b11110000` mask checks for 4-byte chars, `0b11100000` for 3-byte, `0b11000000` for 2-byte, `0b10000000` for 1-byte. For continuation bytes: check `byte & 0b11000000 == 0b10000000`. Keep a counter `n_bytes` for expected continuations. When you encounter a leading byte, set `n_bytes` to the required count (1-4). Decrement for each valid continuation byte.

### Tier 3 Hint - Optimization Strategy
Iterate through the array once: O(n) time, O(1) space. For each byte: if `n_bytes == 0`, determine the character type and set `n_bytes` accordingly. Otherwise, verify it's a valid continuation byte (`10xxxxxx`) and decrement `n_bytes`. Edge cases: ensure `n_bytes` is exactly 0 at the end, and validate that multi-byte characters use the minimum encoding (e.g., ASCII characters must use 1 byte, not 2+).

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Bit Masking (state machine) | O(n) | O(1) | Single pass with counter |
| String Conversion + Regex | O(n) | O(n) | Convert to binary strings, match patterns |
| Byte-by-byte validation | O(n) | O(1) | Check each byte independently (same as mask) |
| Recursive validation | O(n) | O(n) | Unnecessary recursion overhead |

## Common Mistakes

### Mistake 1: Not masking to 8 bits
```python
# Wrong - doesn't handle only least 8 bits
def validUtf8(data):
    n_bytes = 0
    for num in data:
        # num could be > 255, need to mask
        if n_bytes == 0:
            if num >> 7 == 0:  # Should use (num & 0xFF)
                continue
            # ... rest of logic
```

**Why it's wrong:** Problem states each integer uses only least significant 8 bits. Must mask with `& 0xFF` or `& 0b11111111`.

**Fix:** Apply `num = num & 0xFF` at the start of each iteration.

### Mistake 2: Incorrect bit pattern checks
```python
# Wrong - incorrect mask comparison
def validUtf8(data):
    n_bytes = 0
    for num in data:
        num &= 0xFF
        if n_bytes == 0:
            if num & 0b10000000 == 0:  # Correct for 1-byte
                continue
            elif num & 0b11100000:  # WRONG - should be == 0b11000000
                n_bytes = 1
```

**Why it's wrong:** Must use exact equality checks like `==`, not just `&`. Pattern `110xxxxx` requires `(num & 0b11100000) == 0b11000000`.

**Fix:** Use proper equality checks for bit patterns.

### Mistake 3: Not validating at sequence end
```python
# Incomplete - doesn't check final state
def validUtf8(data):
    n_bytes = 0
    for num in data:
        num &= 0xFF
        if n_bytes == 0:
            # determine n_bytes...
        else:
            if (num & 0b11000000) != 0b10000000:
                return False
            n_bytes -= 1
    # Missing: return n_bytes == 0
    return True
```

**Why it's wrong:** If data ends mid-character (n_bytes > 0), should return False.

**Fix:** Add final check `return n_bytes == 0`.

## Variations

| Variation | Difference | Difficulty Δ |
|-----------|-----------|-------------|
| UTF-16 validation | Validate UTF-16 encoding instead | +1 |
| Count UTF-8 characters | Return count of valid characters | 0 |
| Decode UTF-8 to Unicode | Return actual Unicode code points | +1 |
| Repair invalid UTF-8 | Replace invalid bytes with placeholder | +1 |
| Validate and extract | Return (valid, decoded_chars) tuple | +1 |
| Streaming validation | Process bytes one at a time | 0 |

## Practice Checklist

Track your progress on this problem:

- [ ] Solved using bit masking approach
- [ ] Correctly handled all 1-4 byte character types
- [ ] Validated continuation byte patterns (10xxxxxx)
- [ ] After 1 day: Re-solved from memory
- [ ] After 1 week: Solved in < 15 minutes
- [ ] Explained UTF-8 encoding rules to someone

**Strategy**: See [Bit Manipulation Pattern](../strategies/patterns/bit-manipulation.md)
