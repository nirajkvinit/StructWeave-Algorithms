---
id: E118
old_id: I119
slug: generalized-abbreviation
title: Generalized Abbreviation
difficulty: easy
category: easy
topics: ["string"]
patterns: ["backtracking", "bit-manipulation"]
estimated_time_minutes: 15
frequency: low
related_problems: ["E116", "M020", "E078"]
prerequisites: ["string-manipulation", "backtracking", "bit-operations"]
strategy_ref: ../strategies/patterns/backtracking.md
---
# Generalized Abbreviation

## Problem

A generalized abbreviation lets you shorten a word by replacing sequences of characters with their count. For example, "internationalization" could become "i18n" by replacing the 18 middle letters with the number 18. In this problem, you'll generate all possible valid abbreviations of a word.

Here's how abbreviation works: you can choose any set of character sequences in the word and replace each sequence with its length. The catch is that these sequences must be non-overlapping (characters can't be counted twice) and non-adjacent (you can't have two numbers next to each other).

Consider the word "abcde". Valid abbreviations include "a3e" (replacing "bcd" with 3), "1bcd1" (replacing both ends), "5" (replacing everything), and "abcde" (replacing nothing). However, "23" would be invalid because it creates two adjacent numbers, and "22de" would be invalid because the sequences "ab" and "bc" overlap at character 'b'.

For a given string `word`, generate all possible generalized abbreviations. You can return them in any order. Keep in mind that for a word of length n, there are exactly 2^n possible abbreviations since each character has two choices: keep it or abbreviate it.

## Why This Matters

This problem appears in text compression systems, autocomplete features, and search indexing where shortened representations help save space while maintaining searchability. It builds your understanding of backtracking, a powerful technique for exploring all possible solutions systematically. The problem also connects to bit manipulation since each abbreviation corresponds to a binary number where each bit represents "keep" or "abbreviate" for that position. These skills are fundamental for solving constraint satisfaction problems and are frequently tested in technical interviews for companies building text-processing systems.

## Examples

**Example 1:**
- Input: `word = "word"`
- Output: `["4","3d","2r1","2rd","1o2","1o1d","1or1","1ord","w3","w2d","w1r1","w1rd","wo2","wo1d","wor1","word"]`

**Example 2:**
- Input: `word = "a"`
- Output: `["1","a"]`

## Constraints

- The word length is between 1 and 15 characters
- The word contains only lowercase English letters

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Hint 1: Intuition (Beginner)
For each character in the word, you have two choices: either keep it as-is or abbreviate it (replace with a count). This creates a decision tree. Think about how many total abbreviations are possible for a word of length n. The answer is 2^n because each character is either kept or abbreviated.

### Hint 2: Optimization (Intermediate)
Use backtracking to explore all possibilities. At each position, branch into two paths: one that keeps the current character and one that abbreviates it. When abbreviating, accumulate consecutive abbreviated characters into a count. Don't place two numbers adjacent to each other (they would merge into one count).

### Hint 3: Implementation Details (Advanced)
Use a recursive backtracking function with parameters: current position, current abbreviation being built, and count of consecutive abbreviated characters. When you keep a character, first append any accumulated count, then the character. When abbreviating, increment the count. Alternatively, use bit manipulation: each of 2^n binary numbers represents a keep/abbreviate decision for each position.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Backtracking | O(2^n * n) | O(n) | 2^n abbreviations, O(n) to build each |
| Bit manipulation | O(2^n * n) | O(2^n * n) | Same combinations, explicit storage |
| Optimized backtracking | O(2^n * n) | O(n) | Recursive call stack depth |
| Iterative generation | O(2^n * n) | O(2^n * n) | Store all results |

## Common Mistakes

### Mistake 1: Adjacent Numbers
```python
# Wrong: Creating invalid abbreviations with adjacent numbers
def generate(word):
    # Creates "1o1d" -> "11d" incorrectly
    return word[0:1] + "1" + "1" + word[-1]  # Invalid!
```
**Fix:** Never place two numbers next to each other; they represent non-adjacent abbreviated sections.

### Mistake 2: Not Accumulating Counts
```python
# Wrong: Creating separate counts for consecutive abbreviations
def backtrack(pos, path, count):
    if abbreviate:
        path.append(str(1))  # Should accumulate into count!
```
**Fix:** Accumulate consecutive abbreviated characters into a single count before appending.

### Mistake 3: Missing Base Case
```python
# Wrong: Not handling the accumulated count at the end
def backtrack(pos, path, count):
    if pos == len(word):
        return ''.join(path)  # Forgot to append count!
```
**Fix:** Before returning, check if there's an accumulated count and append it to the result.

## Variations

| Variation | Description | Difficulty | Key Difference |
|-----------|-------------|------------|----------------|
| Valid Abbreviation | Check if abbreviation matches word | Easy | Validation instead of generation |
| Unique Abbreviations | Find all unique abbreviations | Medium | Avoid duplicates from different paths |
| Minimum Abbreviation | Find shortest representation | Medium | Optimization criterion |
| K-Length Abbreviations | Generate only length-k abbreviations | Medium | Constraint on output length |

## Practice Checklist

Study Plan:
- [ ] Day 1: Understand backtracking, count total possibilities (2^n)
- [ ] Day 3: Implement recursive solution, handle count accumulation
- [ ] Day 7: Solve using bit manipulation approach
- [ ] Day 14: Optimize memory usage, solve without hints
- [ ] Day 30: Speed solve (< 15 minutes), explain both approaches

Key Mastery Indicators:
- Can explain why there are 2^n abbreviations
- Handle count accumulation correctly in backtracking
- Understand connection to binary representations
- Avoid creating adjacent numbers

**Strategy**: See [Backtracking](../strategies/patterns/backtracking.md)
