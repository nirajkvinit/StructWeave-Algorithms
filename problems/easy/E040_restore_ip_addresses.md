---
id: E040
old_id: F093
slug: restore-ip-addresses
title: Restore IP Addresses
difficulty: easy
category: easy
topics: ["string"]
patterns: []
estimated_time_minutes: 15
frequency: medium
related_problems: ["E039", "M019", "M035"]
prerequisites: ["backtracking", "string-validation"]
strategy_ref: ../../strategies/patterns/backtracking.md
---
# Restore IP Addresses

## Problem

Given a string containing only digits, generate all possible valid IP addresses that can be formed by inserting exactly three dots into the string. An IP address consists of exactly four segments separated by dots, where each segment is a number between 0 and 255.

For example, given the string "25525511135", you could form "255.255.11.135" or "255.255.111.35", both of which are valid IP addresses. However, "255.255.1113.5" would be invalid because 1113 exceeds 255.

**IP address rules:**
- Must have exactly 4 segments separated by 3 dots
- Each segment must be a number from 0 to 255 (inclusive)
- No segment can have leading zeros, except for the number 0 itself
  - Valid: "0", "5", "123", "255"
  - Invalid: "01", "001", "0123"
- All digits in the input string must be used exactly once
- The string length is between 1 and 20 digits

**Edge cases to consider:**
```
"0000" → ["0.0.0.0"]  (all segments are valid zeros)
"101023" → ["1.0.10.23", "1.0.102.3", "10.1.0.23", "10.10.2.3", "101.0.2.3"]
"256123" → [] if trying "256..." (256 exceeds 255, so different partitioning needed)
```

## Why This Matters

This problem directly models network address validation, which is critical in systems programming, network security, and web development. Beyond the immediate application, it teaches backtracking with constraints—a technique used in configuration management, resource allocation, and constraint satisfaction problems. The skill of systematically exploring combinations while pruning invalid branches early (avoiding "256..." or leading zeros) is essential for building efficient parsers, validators, and search algorithms. This type of structured enumeration appears in scenarios ranging from URL parsing to configuration file validation.

## Examples

**Example 1:**
- Input: `s = "25525511135"`
- Output: `["255.255.11.135","255.255.111.35"]`

**Example 2:**
- Input: `s = "0000"`
- Output: `["0.0.0.0"]`

**Example 3:**
- Input: `s = "101023"`
- Output: `["1.0.10.23","1.0.102.3","10.1.0.23","10.10.2.3","101.0.2.3"]`

## Constraints

- 1 <= s.length <= 20
- s consists of digits only.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: IP Address Structure</summary>

A valid IP address has exactly 4 segments, each containing 1-3 digits representing a number from 0 to 255. Additionally, numbers cannot have leading zeros (except for "0" itself).

How many ways can you partition a string into 4 segments? What makes each segment valid?

</details>

<details>
<summary>🎯 Hint 2: Backtracking with Constraints</summary>

Use backtracking to try different ways of partitioning the string into 4 parts. At each step:
- Try taking 1, 2, or 3 digits for the current segment
- Validate that the segment forms a valid IP part
- Recursively build the remaining segments

Prune invalid paths early (e.g., if you've used too many characters and haven't formed 4 segments yet).

</details>

<details>
<summary>📝 Hint 3: Backtracking Algorithm</summary>

```
function backtrack(start_index, segments_formed, current_ip):
    # Base case: formed 4 segments
    if segments_formed == 4:
        if start_index == len(s):
            add current_ip to results
        return

    # Try segments of length 1, 2, 3
    for length in [1, 2, 3]:
        if start_index + length > len(s):
            break

        segment = s[start_index : start_index + length]

        # Validate segment
        if is_valid(segment):
            new_ip = current_ip + segment
            if segments_formed < 3:
                new_ip += "."
            backtrack(start_index + length, segments_formed + 1, new_ip)

function is_valid(segment):
    # Check leading zeros
    if len(segment) > 1 and segment[0] == '0':
        return False
    # Check range 0-255
    return 0 <= int(segment) <= 255
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(3^4 × n) | O(n) | Try all 3^4 partitions, validate each |
| **Backtracking** | **O(3^4)** | **O(1)** | **Constant partitions (4 segments), early pruning** |
| Three nested loops | O(1) | O(1) | Only 3^4 = 81 combinations to check |

Note: The string length n is at most 20, but valid IPs use at most 12 characters.

## Common Mistakes

### 1. Not Validating Leading Zeros
```python
# WRONG: Allows "01" as a segment
def is_valid(segment):
    return 0 <= int(segment) <= 255

# CORRECT: Reject leading zeros
def is_valid(segment):
    if len(segment) > 1 and segment[0] == '0':
        return False
    return 0 <= int(segment) <= 255
```

### 2. Not Checking Remaining Length
```python
# WRONG: May create IPs with unused characters
def backtrack(start, segments, path):
    if segments == 4:
        result.append(path)  # Doesn't check if all chars used!
        return

# CORRECT: Ensure all characters are used
def backtrack(start, segments, path):
    if segments == 4:
        if start == len(s):  # All characters used
            result.append(path)
        return
```

### 3. Inefficient Pruning
```python
# WRONG: Doesn't prune impossible cases
def backtrack(start, segments, path):
    for length in [1, 2, 3]:
        segment = s[start:start+length]
        # Always recurses even when impossible

# CORRECT: Early pruning
def backtrack(start, segments, path):
    # Prune: not enough chars left
    remaining = len(s) - start
    needed_segments = 4 - segments
    if remaining < needed_segments or remaining > needed_segments * 3:
        return
    # ... rest of logic ...
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| IPv6 addresses | 8 segments, hex digits, range 0-FFFF | Adjust validation, allow A-F characters |
| Count valid IPs | Return count instead of list | Track count instead of building strings |
| Minimize segments | Find minimum segments needed | Variable segment count, minimize in DP |
| Custom range | Segments have different max values | Parameterize validation function |
| Lexicographic order | Return IPs in sorted order | Sort results or generate in order |

## Practice Checklist

**Correctness:**
- [ ] Handles leading zeros correctly
- [ ] Validates range 0-255 for each segment
- [ ] Generates exactly 4 segments
- [ ] Uses all input characters
- [ ] Returns empty list when no valid IPs exist

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 12 minutes
- [ ] Can discuss time/space complexity
- [ ] Can explain pruning strategies
- [ ] Can handle follow-up about IPv6

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Backtracking](../../strategies/patterns/backtracking.md)
