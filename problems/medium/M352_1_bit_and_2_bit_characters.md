---
id: M352
old_id: A184
slug: 1-bit-and-2-bit-characters
title: 1-bit and 2-bit Characters
difficulty: medium
category: medium
topics: ["array", "greedy"]
patterns: ["greedy-parsing"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E070", "M091", "M639"]
prerequisites: ["array-traversal", "greedy-algorithm"]
---
# 1-bit and 2-bit Characters

## Problem

Imagine a simplified character encoding system where characters are represented using either one or two bits. This system has a clever constraint that makes decoding unambiguous:

- A **one-bit character** is represented as `0` (just a single zero).
- A **two-bit character** is represented as either `10` or `11` (always starts with 1).

Notice the key property: whenever you see a `1`, you know it must be the start of a two-bit character. This makes the encoding prefix-free, meaning you can decode left-to-right without ambiguity.

Given a binary array `bits` that always ends with `0`, determine whether the last character in the decoded message is a one-bit character. The array represents a complete valid encoding, and you need to figure out if that final `0` stands alone as a one-bit character, or if it's the second bit of a `10` two-bit character.

For example, with `bits = [1, 0, 0]`, the decoding is deterministic: the first `1` forces us to consume the next bit, giving us the two-bit character `10`. Then the final `0` stands alone as a one-bit character, so the answer is `true`. However, with `bits = [1, 1, 1, 0]`, we decode as `11` followed by `10`, meaning the last character is the two-bit `10`, so the answer is `false`.

The challenge is to determine this efficiently. You could simulate the entire decoding process from left to right, or you could use a clever observation about the pattern of `1`s immediately before the final `0`.

## Why This Matters

This problem teaches the fundamentals of encoding schemes and greedy parsing, which are central to compression algorithms, network protocols, and compiler design. Variable-length encodings like UTF-8 and Huffman coding use similar prefix-free properties to pack data efficiently while remaining unambiguous. The pattern recognition skill you develop here—understanding how to work backwards from constraints rather than forward through simulation—is valuable for optimizing parsers and validators in real systems.

## Examples

**Example 1:**
- Input: `bits = [1,0,0]`
- Output: `true`
- Explanation: This decodes uniquely as a two-bit character followed by a one-bit character.
Therefore, the final character is single-bit.

**Example 2:**
- Input: `bits = [1,1,1,0]`
- Output: `false`
- Explanation: This decodes uniquely as two consecutive two-bit characters.
Therefore, the final character is not single-bit.

## Constraints

- 1 <= bits.length <= 1000
- bits[i] is either 0 or 1.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Understanding the Encoding Rules</summary>

The encoding rules are deterministic:
- If you see a `1`, it MUST be the start of a 2-bit character (either `10` or `11`)
- If you see a `0`, it CAN be either:
  - A 1-bit character (standalone `0`)
  - Part of a 2-bit character (`10`)

Key insight: When parsing from left to right, there's NO ambiguity. If you encounter a `1`, you know you must consume the next bit as well. This makes the decoding process greedy and deterministic.

The question is: after parsing the entire array, does the last bit we consumed represent a 1-bit character or is it part of a 2-bit character?
</details>

<details>
<summary>Hint 2: Greedy Parsing Approach</summary>

Parse the array from left to right:
- Start at index 0
- If `bits[i] == 1`, this is a 2-bit character, so jump to `i + 2`
- If `bits[i] == 0`, this is a 1-bit character, so jump to `i + 1`
- Continue until you reach or pass the last element

The answer depends on where you land:
- If you land exactly on the last index (length - 1), then the last character is a 1-bit character
- If you overshoot (land on length), then the last character was part of a 2-bit character

Wait, can you overshoot? Given that the array ends with `0`, think about when you'd land on the last index vs. when you'd go past it.
</details>

<details>
<summary>Hint 3: Simpler Approach - Work Backwards</summary>

Here's an elegant insight: instead of parsing forward, count backwards from the second-to-last position.

Count how many consecutive `1`s appear immediately before the final `0`:
- If there are an EVEN number of `1`s (including 0), the final `0` is a 1-bit character
- If there are an ODD number of `1`s, the final `0` is part of a 2-bit character (`10`)

Why? Each `1` pairs with the bit after it:
- `...1 1 1 0`: Three 1s → pairs as `11`, `10` → last char is 2-bit
- `...1 1 0`: Two 1s → pairs as `11`, then `0` standalone → last char is 1-bit
- `...1 0`: One 1 → pairs as `10` → last char is 2-bit
- `...0 0`: Zero 1s → `0` standalone → last char is 1-bit

This approach is O(n) worst case but often faster and cleaner to implement.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Greedy Forward Parsing | O(n) | O(1) | Parse from start, jump by 1 or 2 |
| Count Consecutive 1s Backward | O(n) | O(1) | Simpler logic, count 1s before last 0 |
| Both are optimal | O(n) | O(1) | Linear scan, constant space |

## Common Mistakes

**Mistake 1: Checking only the second-to-last bit**
```python
# Wrong - only looks at one position before the end
def isOneBitCharacter(bits):
    # Incorrect: assumes bits[-2] determines everything
    if len(bits) < 2:
        return True
    return bits[-2] == 0  # Too simplistic!
    # Fails on [1, 1, 0] where bits[-2] = 1 but we need to look further back
```

**Mistake 2: Not handling edge cases**
```python
# Wrong - doesn't handle length 1
def isOneBitCharacter(bits):
    i = 0
    while i < len(bits) - 1:  # Stops before last element
        if bits[i] == 1:
            i += 2
        else:
            i += 1
    return i == len(bits) - 1
    # Fails on bits = [0] because loop never executes, i stays 0
```

**Mistake 3: Incorrect counting logic**
```python
# Wrong - counts all 1s instead of consecutive 1s before last element
def isOneBitCharacter(bits):
    count_ones = sum(bits[:-1])  # Counts ALL ones, not consecutive
    return count_ones % 2 == 0
    # Fails on [0, 1, 0] which has 1 one (odd) but answer is True
    # because the 1 is not consecutive with the final 0
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Decode Ways | Medium | Multiple encoding schemes, count total ways to decode |
| Decode Ways II | Hard | Includes wildcards, more complex counting |
| UTF-8 Validation | Medium | Variable-length encoding with specific bit patterns |
| Number of Valid Words | Medium | Parse strings with specific character rules |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Reviewed solution
- [ ] Practiced again (1 day later)
- [ ] Practiced again (3 days later)
- [ ] Practiced again (1 week later)
- [ ] Can solve in under 15 minutes
- [ ] Can explain solution clearly
- [ ] Implemented both forward and backward approaches
- [ ] Handled edge cases (length 1, all 1s, etc.)
- [ ] Tested with various patterns of 1s and 0s

**Strategy**: See [Greedy Algorithms](../strategies/patterns/greedy.md)
