---
id: E170
old_id: I267
slug: validate-ip-address
title: Validate IP Address
difficulty: easy
category: easy
topics: ["string", "validation"]
patterns: ["string-parsing", "edge-case-handling"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E093", "E678", "E758"]
prerequisites: ["string-splitting", "number-validation", "regex"]
strategy_ref: ../strategies/patterns/string-manipulation.md
---
# Validate IP Address

## Problem

Given a string `queryIP` that might represent an IP address, determine whether it's a valid IPv4 address, a valid IPv6 address, or neither. Return the string `"IPv4"` if it's a properly formatted IPv4 address, `"IPv6"` if it's a valid IPv6 address, or `"Neither"` if it doesn't match either format.

IPv4 addresses consist of exactly four decimal numbers separated by periods (dots), where each number ranges from 0 to 255. Crucially, leading zeros are forbidden—"192.168.01.1" is invalid even though the numbers are in range. Each segment must be a valid decimal number without extra characters.

IPv6 addresses are more complex: they consist of exactly eight hexadecimal segments separated by colons. Each segment contains 1 to 4 hexadecimal characters (0-9, a-f, A-F), and leading zeros are permitted here. Note that this problem uses a simplified IPv6 format that doesn't support the double-colon abbreviation (::) used in practice to compress consecutive zero segments.

The challenge lies in carefully validating all edge cases: empty segments (like "192..1.1"), out-of-range values, wrong number of segments, invalid characters, mixed delimiters, and the different leading-zero rules for IPv4 versus IPv6. This is fundamentally a string parsing and validation exercise where attention to detail matters more than algorithmic complexity.

## Why This Matters

IP address validation is essential in network programming, web development, and cybersecurity. Improperly validated IP addresses can lead to security vulnerabilities, injection attacks, or system crashes. This problem mirrors real-world input validation scenarios where you must handle user input that might be malformed, malicious, or simply incorrect. The different validation rules for IPv4 and IPv6 demonstrate how the same concept (network addressing) can have dramatically different format requirements.

Beyond networking, this problem exemplifies defensive programming: anticipating all the ways input can be malformed and handling each case explicitly. The systematic approach of separating validation into distinct functions, checking segment counts, and validating each segment's content is a pattern that applies to parsing configuration files, validating form data, and processing any structured text format. Understanding how to handle edge cases methodically—rather than hoping your regex or simple check catches everything—is a crucial professional skill.

## Examples

**Example 1:**
- Input: `queryIP = "172.16.254.1"`
- Output: `"IPv4"`
- Explanation: The string conforms to IPv4 formatting rules.

**Example 2:**
- Input: `queryIP = "2001:0db8:85a3:0:0:8A2E:0370:7334"`
- Output: `"IPv6"`
- Explanation: The string conforms to IPv6 formatting rules.

**Example 3:**
- Input: `queryIP = "256.256.256.256"`
- Output: `"Neither"`
- Explanation: The segments exceed 255, making it invalid for both IPv4 and IPv6.

## Constraints

- queryIP consists only of English letters, digits and the characters '.' and ':'.

## Think About

1. What makes this problem challenging?
   - Handling numerous edge cases for both IPv4 and IPv6
   - Validating leading zeros (forbidden in IPv4, allowed in IPv6)
   - Ensuring correct number of segments and character types
   - Distinguishing between the two formats reliably

2. Can you identify subproblems?
   - Detecting which format to validate based on delimiters
   - Splitting string by appropriate delimiter ('.' or ':')
   - Validating each segment according to format rules
   - Checking segment count and character validity

3. What invariants must be maintained?
   - IPv4: exactly 4 segments, each 0-255, no leading zeros (except "0")
   - IPv6: exactly 8 segments, each 1-4 hex chars, leading zeros allowed
   - No mixing of delimiters or invalid characters

4. Is there a mathematical relationship to exploit?
   - IPv4 segments can be validated as integers in range [0, 255]
   - IPv6 segments only need length and character validation
   - Delimiter count determines which format to attempt

## Approach Hints

### Hint 1: Determine Format and Split
First determine if the input could be IPv4 (contains '.') or IPv6 (contains ':'). Split by the appropriate delimiter and validate the segment count. Then check each segment according to the format's rules.

**Key insight**: The delimiter tells you which format to validate.

**Limitations**: Must handle edge cases like empty segments, mixed delimiters, or wrong segment counts.

### Hint 2: Separate Validation Functions
Create separate helper functions for IPv4 and IPv6 validation. Each function splits the string, checks segment count, and validates each segment with format-specific rules.

**Key insight**: Separation of concerns makes the code cleaner and edge cases easier to handle.

**How to implement**:
- IPv4: check segment count = 4, each segment is 0-255 without leading zeros
- IPv6: check segment count = 8, each segment is 1-4 hex characters
- Return "IPv4", "IPv6", or "Neither" based on validation results
- Handle cases like ".." or "::" carefully

### Hint 3: Comprehensive Edge Case Handling
Build validation with explicit checks for all edge cases: empty segments, out-of-range values, invalid characters, leading zeros (IPv4), segment length (IPv6), and mixed delimiters.

**Key insight**: IP validation is mostly about careful edge case handling rather than complex algorithms.

**Optimization strategy**:
- Check for presence of both '.' and ':' upfront (immediate "Neither")
- For IPv4: verify each segment is numeric, no leading zeros unless "0", value <= 255
- For IPv6: verify each segment is 1-4 hex chars
- Use try-catch for parsing or regex for validation

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Basic Split and Validate | O(n) | O(n) | Split string creates array of segments, validate each |
| Regex-based Validation | O(n) | O(1) | Regex engines optimize pattern matching, no extra storage |
| Manual Character Scanning | O(n) | O(1) | Single pass without splitting, validate on-the-fly |
| Split with Helper Functions | O(n) | O(n) | Most readable, split creates temporary arrays |

## Common Mistakes

### Mistake 1: Not checking for leading zeros in IPv4
```
// Wrong - accepts leading zeros in IPv4
segments = queryIP.split('.')
if (segments.length !== 4) return "Neither"
for (seg of segments) {
    num = parseInt(seg)
    if (num < 0 || num > 255) return "Neither"
}
return "IPv4"

// Why it fails: "192.168.01.1" has leading zero, should be "Neither"
// parseInt("01") = 1, which passes 0-255 check

// Correct - explicitly check for leading zeros
for (seg of segments) {
    if (seg.length > 1 && seg[0] === '0') return "Neither"
    if (seg.length === 0) return "Neither"
    // ... rest of validation
}
```

### Mistake 2: Not validating segment length or empty segments
```
// Wrong - doesn't check for empty segments or length
segments = queryIP.split(':')
if (segments.length !== 8) return "Neither"
for (seg of segments) {
    if (isHex(seg)) continue
    else return "Neither"
}

// Why it fails: "2001::85a3:0:0:8A2E:0370:7334" has "::" creating empty segments
// Or "02001:0db8:..." has segment too long (5 chars)

// Correct - check length bounds
for (seg of segments) {
    if (seg.length === 0 || seg.length > 4) return "Neither"
    // ... check hex validity
}
```

### Mistake 3: Not handling mixed delimiters or invalid characters
```
// Wrong - assumes input is well-formed
if (queryIP.includes('.')) {
    return validateIPv4(queryIP)
} else {
    return validateIPv6(queryIP)
}

// Why it fails: "192.168.1:1" has both delimiters
// "192.168.1.1a" has invalid character 'a' in IPv4

// Correct - check for mixed delimiters and invalid characters
if (queryIP.includes('.') && queryIP.includes(':')) {
    return "Neither"
}
// In IPv4 validation:
if (!/^\d+$/.test(seg)) return "Neither"
// In IPv6 validation:
if (!/^[0-9a-fA-F]+$/.test(seg)) return "Neither"
```

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Parse and normalize IP | Return normalized form (e.g., remove leading zeros in IPv6) | Medium |
| IPv6 with abbreviation | Handle "::" abbreviation for consecutive zeros | Hard |
| CIDR notation validation | Validate IP addresses with subnet masks (e.g., "192.168.1.0/24") | Medium |
| IP range validation | Check if IP is within a given range | Medium |
| MAC address validation | Validate MAC addresses (6 hex pairs) | Easy |
| Domain name validation | Validate domain names with DNS rules | Medium |

## Practice Checklist

Track your progress on mastering this problem:

- [ ] First attempt (understand the problem)
- [ ] Implement IPv4 validation function
- [ ] Implement IPv6 validation function
- [ ] Handle all edge cases (leading zeros, empty segments, invalid chars)
- [ ] Test with boundary cases (all valid examples and edge cases)
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Solve without hints
- [ ] Explain solution to someone else
- [ ] Complete in under 25 minutes

**Strategy**: See [String Manipulation Pattern](../strategies/patterns/string-manipulation.md)
