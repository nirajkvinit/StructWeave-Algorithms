---
id: E162
old_id: I242
slug: string-compression
title: String Compression
difficulty: easy
category: easy
topics: ["array", "string", "two-pointers"]
patterns: ["two-pointers", "in-place-modification"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E157", "M271", "E443"]
prerequisites: ["two-pointers", "in-place-algorithms"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# String Compression

## Problem

Run-length encoding is a simple compression technique that represents consecutive identical characters as the character followed by a count. For example, "aaabbc" becomes "a3b2c1" (or "a3b2c" if we omit counts of 1).

You're given a character array `chars` that needs to be compressed **in-place** using this algorithm with a specific rule: only include the count if it's greater than 1. So "aabbbcccc" becomes "a2b3c4", but "abc" stays as "abc" (not "a1b1c1").

The compression must happen directly within the original `chars` array. You cannot allocate a new array for the result. For counts with multiple digits (like 12), each digit should be written as a separate array element, so count 12 becomes two characters: '1' and '2'.

Return the new length of the compressed array after modification. Your solution must use only **O(1) extra space** (constant additional memory, not counting the input array itself).

This is a classic two-pointer problem: one pointer reads through the original data, counting runs of identical characters, while a second pointer writes the compressed output back into the same array, trailing behind the read pointer.

## Why This Matters

Run-length encoding is used in image compression formats (like BMP and PCX), fax transmission protocols, and data serialization systems where repeated values are common. This problem teaches you in-place array modification with two pointers, a fundamental technique in memory-constrained environments. The pattern of a read pointer scanning ahead while a write pointer updates the array behind it appears in array deduplication, partitioning algorithms, and stream processing. Handling multi-digit numbers by extracting individual digit characters is a common requirement when converting between numeric and string representations without using built-in string formatting. Understanding when compression actually saves space (only when runs are long enough) is important in real compression systems, which often have a decision layer that chooses whether to compress or store data raw based on which is more efficient.

## Examples

**Example 1:**
- Input: `chars = ["a","a","b","b","c","c","c"]`
- Output: `Return 6, and the first 6 characters of the input array should be: ["a","2","b","2","c","3"]`
- Explanation: We have runs of 2 a's, 2 b's, and 3 c's, which compress to "a2b2c3".

**Example 2:**
- Input: `chars = ["a"]`
- Output: `Return 1, and the first character of the input array should be: ["a"]`
- Explanation: A single character has no count appended.

**Example 3:**
- Input: `chars = ["a","b","b","b","b","b","b","b","b","b","b","b","b"]`
- Output: `Return 4, and the first 4 characters of the input array should be: ["a","b","1","2"].`
- Explanation: One 'a' followed by twelve 'b's becomes "ab12" (the digits 1 and 2 are stored separately).

## Constraints

- 1 <= chars.length <= 2000
- chars[i] is a lowercase English letter, uppercase English letter, digit, or symbol.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Build Result String First
**Hint**: Create compressed string in a separate array/string, then copy back to original.

**Key Ideas**:
- Use two pointers: read and count consecutive chars
- Build compressed string in temporary storage
- Convert count to individual digits and append
- Copy result back to original array

**Why This Works**: Simpler to reason about, but uses O(n) extra space.

### Intermediate Approach - Two Pointers with Write Index
**Hint**: Use one pointer to read, another to write directly into the same array.

**Optimization**:
- Read pointer scans for character runs
- Count consecutive identical characters
- Write pointer writes character and count digits in-place
- Advance both pointers appropriately

**Trade-off**: O(1) space, but requires careful index management.

### Advanced Approach - Optimized In-Place with Run Counting
**Hint**: Track current character run length while reading, write immediately when run ends.

**Key Insight**:
- Read index scans array
- Count consecutive chars, when different char found, write previous run
- Convert count to string, write each digit separately
- Handle final run after loop ends

**Why This is Optimal**: O(n) time, O(1) space, single pass with minimal overhead.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| New Array | O(n) | O(n) | Build compressed string separately |
| Two Pointers In-Place | O(n) | O(1) | Direct modification with write pointer |
| Optimized Single Pass | O(n) | O(1) | Most efficient, handles digits correctly |
| String Concatenation | O(n^2) | O(n) | Inefficient string operations in some languages |

## Common Mistakes

### Mistake 1: Not splitting multi-digit counts
```
# WRONG - Writing count as single character
for char in chars:
    # ... count consecutive chars ...
    chars[write] = char
    chars[write+1] = str(count)  # "12" becomes one char, not '1', '2'
    write += 2
```
**Why it fails**: Count 12 must be written as two separate characters '1' and '2', not as string "12".

**Correct approach**: Convert count to string, iterate through each digit character separately.

### Mistake 2: Off-by-one with read/write pointers
```
# WRONG - Incorrect pointer advancement
read = 0
write = 0
while read < len(chars):
    count = 1
    while read + 1 < len(chars) and chars[read] == chars[read + 1]:
        read += 1
        count += 1
    chars[write] = chars[read]
    write += 1
    # Missing: write count digits
    read += 1  # Only advance by 1, but already advanced in inner loop!
```
**Why it fails**: Double-advancing read pointer or not handling write correctly.

**Correct approach**: Carefully track when each pointer advances, use clear loop invariants.

### Mistake 3: Forgetting single-character runs
```
# WRONG - Always writing count
count = 1
# ... count consecutive chars ...
chars[write] = char
write += 1
for digit in str(count):  # Always writes count, even for 1
    chars[write] = digit
    write += 1
```
**Why it fails**: Single character should not have "1" appended per problem rules.

**Correct approach**: Only write count if count > 1.

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Decompress Run-Length String | Reverse operation: expand compressed string | Easy |
| Custom Compression Format | Different encoding rules (e.g., count before char) | Easy |
| Optimal Compression Decision | Only compress if result is shorter | Medium |
| Compression with Escape Characters | Handle special characters in input | Medium |
| Two-Pass Compression | First pass determines if worthwhile, second compresses | Medium |

## Practice Checklist

Track your progress as you master this problem:

- [ ] **Day 1**: Solve with separate array approach (allow 20 mins)
- [ ] **Day 2**: Implement in-place two-pointer solution
- [ ] **Day 3**: Code without reference, handle multi-digit counts
- [ ] **Week 2**: Test edge cases: single char, all same, all different
- [ ] **Week 4**: Solve decompression variation
- [ ] **Week 8**: Speed drill - solve in under 12 minutes

**Strategy**: See [Two Pointers Pattern](../strategies/patterns/two-pointers.md) for in-place modification techniques.
