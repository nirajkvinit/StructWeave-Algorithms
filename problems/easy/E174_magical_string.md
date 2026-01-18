---
id: E174
old_id: I280
slug: magical-string
title: Magical String
difficulty: easy
category: easy
topics: ["string", "simulation"]
patterns: ["two-pointers", "string-generation"]
estimated_time_minutes: 15
frequency: low
related_problems: ["E038", "E443", "E604"]
prerequisites: ["string-manipulation", "two-pointer-technique", "simulation"]
strategy_ref: ../strategies/patterns/simulation.md
---
# Magical String

## Problem

A magical string is a self-describing sequence containing only the characters '1' and '2'. What makes it magical is that the string describes its own structure: when you group consecutive identical characters together, the sequence of group lengths is exactly the magical string itself.

Let's visualize this fascinating property. The magical string starts as "1221121221221121122...". When we segment it into groups of consecutive identical characters, we get: "1", "22", "11", "2", "1", "22", "1", "22", "11", "2", "11", "22", and so on. Now count the length of each group: 1, 2, 2, 1, 1, 2, 1, 2, 2, 1, 2, 2... Notice anything? These group lengths perfectly match the original magical string character by character.

Given an integer n, your task is to count how many '1's appear in the first n characters of this magical string. The challenge is generating the string efficiently - you can't use a simple formula because each part of the string determines what comes next through its self-referential property.

## Why This Matters

Self-describing sequences like this magical string appear in various areas of computer science and mathematics, from analyzing run-length encoding patterns to understanding self-similar fractals. The core algorithmic pattern here is simulation with two pointers: one pointer reads values to determine what to generate, while another pointer tracks where you're writing. This pattern appears in many real-world scenarios like interpreting bytecode instructions, parsing self-referential file formats, or processing streams where metadata describes upcoming data. The problem also teaches careful state management - you need to track multiple indices and carefully handle boundary conditions when generation must stop mid-group.

## Examples

**Example 1:**
- Input: `n = 6`
- Output: `3`
- Explanation: The first 6 characters are "122112" containing three 1's.

**Example 2:**
- Input: `n = 1`
- Output: `1`

## Constraints

- 1 <= n <= 10⁵

## Think About

1. What makes this problem challenging?
   - Understanding the self-describing property of the magical string
   - Building the string incrementally based on its own content
   - Maintaining two pointers: one for reading group sizes, one for writing
   - Knowing when to stop generation (exactly at n characters)

2. Can you identify subproblems?
   - Generating the magical string character by character
   - Tracking the current group size being processed
   - Alternating between adding '1's and '2's
   - Counting '1's as the string is built

3. What invariants must be maintained?
   - String starts with "122"
   - Each group's length is determined by the value at the group-index pointer
   - Characters alternate between '1' and '2'
   - The sequence of group lengths matches the original string

4. Is there a mathematical relationship to exploit?
   - Two-pointer approach: one reads group sizes, one writes characters
   - Group-index pointer advances slower than write pointer
   - The string generates itself - current position determines future content
   - Can count '1's during generation, no need to recount

## Approach Hints

### Hint 1: Generate Full String Then Count
Build the entire magical string up to length n by following the self-describing rule. Start with "122", then use a pointer to read group sizes and another to track where to append. After generation, count the '1's.

**Key insight**: The string describes its own grouping structure.

**Limitations**: Slightly inefficient as it requires two passes (generate + count), but conceptually clear.

### Hint 2: Generate with Concurrent Counting
Build the string while simultaneously counting '1's. Use two pointers: `groupIndex` to read group sizes and `writeIndex` for the current position. Alternate between appending '1' and '2' based on which was last used.

**Key insight**: Can count during generation to avoid a second pass.

**How to implement**:
- Initialize s = "122", count1 = 1, groupIndex = 2, currentChar = 1
- While length < n:
  - Read groupSize from s[groupIndex]
  - Append currentChar, groupSize times (or until length reaches n)
  - If appending '1', increment count
  - Toggle currentChar between 1 and 2
  - Increment groupIndex

### Hint 3: Optimized Generation with Early Termination
Generate the magical string only until exactly n characters are reached. Use careful boundary checking to avoid generating more than needed. This minimizes both time and space.

**Key insight**: Stop immediately when reaching n characters, even mid-group.

**Optimization strategy**:
- Track exact length at all times
- When appending a group, check if it would exceed n
- If so, only add remaining characters needed
- Count '1's as you add them
- No string concatenation overhead - use array/list for efficiency

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Generate then Count | O(n) | O(n) | Build full string, then iterate to count '1's |
| Generate with Count | O(n) | O(n) | Single pass, count during generation |
| Optimized with Array | O(n) | O(n) | Use array instead of string concatenation for efficiency |
| Mathematical Pattern | O(1) or O(n) | O(1) | If pattern exists (research shows no simple formula known) |

## Common Mistakes

### Mistake 1: Not initializing the string correctly
```
// Wrong - starts with empty string or wrong initialization
s = ""
groupIndex = 0

// Why it fails: The magical string must start with "122"
// Starting empty means no group sizes to read

// Correct - initialize with the first three characters
s = "122"
groupIndex = 2  // Start reading from index 2
count1 = 1      // "122" has one '1'
```

### Mistake 2: Not handling the boundary when n is reached mid-group
```
// Wrong - adds entire group even if it exceeds n
while (s.length < n) {
    groupSize = parseInt(s[groupIndex])
    for (let i = 0; i < groupSize; i++) {
        s += currentChar
    }
    // ... toggle and increment
}

// Why it fails: If n=5 and adding a group of size 2 when length is 4
// Result would have length 6, not 5

// Correct - check during each addition
for (let i = 0; i < groupSize && s.length < n; i++) {
    s += currentChar
    if (currentChar === '1') count1++
}
```

### Mistake 3: Incorrect pointer management
```
// Wrong - doesn't advance group pointer correctly
while (s.length < n) {
    groupSize = parseInt(s[groupIndex])
    // ... add characters
    currentChar = currentChar === '1' ? '2' : '1'
    // Forgot to increment groupIndex!
}

// Why it fails: Reads same group size repeatedly, infinite loop or wrong output
// Must advance groupIndex after processing each group

// Correct - advance pointer after each group
groupIndex++
currentChar = currentChar === '1' ? '2' : '1'
```

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Count '2's instead | Count occurrences of '2' in first n characters | Easy |
| K-magical string | Use digits 1 to k instead of just 1 and 2 | Medium |
| Find nth character | Return the nth character without building full string | Medium |
| Magical string pattern | Identify if any mathematical pattern exists for count | Hard |
| Reverse magical string | Start with result and reconstruct original | Hard |
| Generalized self-describing | Other self-describing sequences with different rules | Hard |

## Practice Checklist

Track your progress on mastering this problem:

- [ ] First attempt (understand the problem)
- [ ] Understand the self-describing property
- [ ] Implement basic generation approach
- [ ] Add concurrent counting during generation
- [ ] Handle boundary condition (n reached mid-group)
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Solve without hints
- [ ] Explain solution to someone else
- [ ] Complete in under 20 minutes

**Strategy**: See [Simulation Pattern](../strategies/patterns/simulation.md)
