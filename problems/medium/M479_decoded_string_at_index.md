---
id: M479
old_id: A347
slug: decoded-string-at-index
title: Decoded String at Index
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Decoded String at Index

## Problem

Imagine you receive a compressed message where letters are text and digits mean "repeat everything so far." Your task is to find a specific character in the decoded message without actually building the entire (potentially massive) string.

You receive an encoded string `s` that expands into a decoded sequence. The decoding process reads each character left to right:

- **Letter characters**: append the letter to the current decoded sequence
- **Digit character `d`**: replicate the entire current sequence `d - 1` additional times (making `d` total copies)

For example, "a2b3" decodes as: "a" → "aa" (multiply by 2) → "aab" → "aabaabaaab" (multiply by 3).

Given an integer `k`, determine the `k`th character (**using 1-based indexing**) in the fully decoded sequence, without building the full string.

**Challenge**: The decoded string can be up to 2⁶³ characters long, making it impossible to construct in memory.

## Why This Matters

This problem models data decompression algorithms used in file compression (ZIP, GZIP), network protocol optimization where repeated patterns are encoded compactly, and video streaming codecs that reference previous frames. The reverse mathematical calculation technique applies to memory-efficient processing of astronomical datasets, genetic sequence analysis where DNA patterns repeat at different scales, and log file analysis systems that need to query specific positions in compressed logs without full decompression. Understanding how to work with virtual structures larger than memory is crucial for big data systems.

## Examples

**Example 1:**
- Input: `s = "algo2prac3", k = 10`
- Output: `"p"`
- Explanation: After full decoding: "algoalgopracalgoalgopracalgoalgoprac".
Character at position 10 is "p".

**Example 2:**
- Input: `s = "ha22", k = 5`
- Output: `"h"`
- Explanation: After full decoding: "hahahaha".
Character at position 5 is "h".

**Example 3:**
- Input: `s = "a2345678999999999999999", k = 1`
- Output: `"a"`
- Explanation: The decoded sequence consists of "a" repeated 8301530446056247680 times.
Character at position 1 is "a".

## Constraints

- 2 <= s.length <= 100
- s consists of lowercase English letters and digits 2 through 9.
- s starts with a letter.
- 1 <= k <= 10⁹
- It is guaranteed that k is less than or equal to the length of the decoded string.
- The decoded string is guaranteed to have less than 2⁶³ letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
You cannot actually build the decoded string - it can be up to 2^63 characters long! Instead, think about the structure: when you see a digit d, the entire current string repeats d times. The key insight is that if you're looking for position k in a repeated string of length L*d, it's equivalent to finding position k % L in the original string of length L. Work backwards from the end.
</details>

<details>
<summary>🎯 Main Approach</summary>
First, calculate the total decoded length by scanning forward (tracking size, but not building the string). Then, work backwards through the encoded string: when you see a digit, the decoded length before that digit was size/digit. Update k = k % new_size. When you see a letter and k is 0 or k equals current position, that's your answer. This avoids building the massive decoded string.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Handle the modulo operation carefully - when k becomes 0 after modulo, check if the current character is a letter (not a digit). Also, you can optimize by calculating the final size first in O(n), then working backwards in another O(n) pass, giving O(n) time with O(1) space instead of trying to build the string.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Build Full String (Naive) | O(2^63) | O(2^63) | Impossible - exceeds memory and time limits |
| Optimal (Reverse Calculation) | O(n) | O(1) | n is length of encoded string |

## Common Mistakes

1. **Trying to build the actual decoded string**
   ```python
   # Wrong: Will run out of memory
   decoded = ""
   for c in s:
       if c.isdigit():
           decoded = decoded * int(c)
       else:
           decoded += c
   return decoded[k-1]

   # Correct: Only track the length
   size = 0
   for c in s:
       if c.isdigit():
           size *= int(c)
       else:
           size += 1
   ```

2. **Not handling k % size correctly**
   ```python
   # Wrong: k can become 0, which needs special handling
   for c in reversed(s):
       if c.isdigit():
           size //= int(c)
           k = k % size

   # Correct: When k is 0 and we see a letter, that's the answer
   for c in reversed(s):
       if c.isdigit():
           size //= int(c)
           k %= size
       elif k == 0 or k == size:
           return c
       size -= 1
   ```

3. **Off-by-one errors with 1-based indexing**
   ```python
   # Wrong: Forgetting k is 1-based
   k = k % size

   # Correct: Handle the 1-based indexing properly
   k = k % size if k % size != 0 else size
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Encode and Decode Strings | Medium | Design encoding/decoding scheme with delimiter |
| String Compression | Easy | Run-length encoding instead of multiplication |
| Decode Ways | Medium | Count number of decodings instead of finding character |
| Number of Atoms | Hard | Parse nested chemical formulas with multiplication |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Mathematical Patterns](../../strategies/patterns/math-patterns.md)
